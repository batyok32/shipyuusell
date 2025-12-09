from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
import stripe
from django.conf import settings
from django.utils import timezone
from .models import Payment
import logging
import traceback
logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create Stripe Checkout session"""
    amount = float(request.data.get('amount', 0))
    currency = request.data.get('currency', 'USD')
    payment_type = request.data.get('payment_type', 'shipping')
    success_url = request.data.get('success_url', 'http://localhost:3000/payment/success')
    cancel_url = request.data.get('cancel_url', 'http://localhost:3000/payment/cancel')
    metadata = request.data.get('metadata', {})
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {
                        'name': f'YuuSell Logistics - {payment_type}',
                    },
                    'unit_amount': int(amount * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': str(request.user.id),
                'payment_type': payment_type,
                **metadata
            },
            customer_email=request.user.email,
        )
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            stripe_checkout_session_id=checkout_session.id,
            amount=amount,
            currency=currency,
            payment_type=payment_type,
            metadata=metadata,
            status='pending'
        )
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'payment_id': payment.payment_id
        })
        
    except stripe.error.StripeError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """Handle Stripe webhooks"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Update payment status
        try:
            payment = Payment.objects.get(stripe_checkout_session_id=session.id)
            payment.status = 'completed'
            payment.stripe_payment_intent_id = session.payment_intent
            payment.save()
            
            # Handle buy and ship quote payment
            # Check both payment_type field and metadata for backward compatibility
            is_buy_and_ship = (
                payment.payment_type == 'buy_and_ship_quote' or 
                payment.metadata.get('payment_type') == 'buy_and_ship_quote'
            )
            
            if is_buy_and_ship:
                from buying.models import BuyAndShipQuote, BuyingRequest
                from buying.services.email_service import send_payment_received_agent_email, send_payment_receipt_user_email
                from logistics.models import LogisticsShipment, TransportMode
                from logistics.services.pricing_calculator import PricingCalculator
                from decimal import Decimal
                import uuid
                
                quote_id = payment.metadata.get('quote_id')
                buying_request_id = payment.metadata.get('buying_request_id')
                
                if quote_id:
                    try:
                        quote = BuyAndShipQuote.objects.get(id=quote_id)
                        quote.status = 'approved'
                        quote.save()
                        
                        buying_request = quote.buying_request
                        buying_request.status = 'payment_received'
                        buying_request.save()
                        
                        # Create LogisticsShipment for warehouse to destination shipping
                        # This shipment will be used when package arrives at warehouse
                        shipping_address = buying_request.shipping_address
                        destination_address = {
                            'full_name': shipping_address.get('full_name', ''),
                            'street_address': shipping_address.get('street_address', ''),
                            'street_address_2': shipping_address.get('street_address_2', ''),
                            'city': shipping_address.get('city', ''),
                            'state_province': shipping_address.get('state_province', ''),
                            'postal_code': shipping_address.get('postal_code', ''),
                            'country': shipping_address.get('country', ''),
                            'phone': shipping_address.get('phone', ''),
                            'email': buying_request.user.email,
                        }
                        
                        # Get warehouse address
                        calculator = PricingCalculator()
                        approximate_data = buying_request.approximate_quote_data or {}
                        weight = float(approximate_data.get('weight', 1.0))
                        dimensions = approximate_data.get('dimensions', {'length': 10, 'width': 10, 'height': 10})
                        item_type = approximate_data.get('item_type')  # Check if it's a vehicle
                        
                        # Determine shipping category
                        if item_type == 'vehicle' or item_type == 'car':
                            shipping_category = 'vehicle'
                        else:
                            shipping_category = 'small_parcel' if weight < 30 else 'heavy_parcel'
                        warehouse_address = calculator.get_warehouse_address('US', shipping_category)
                        if not warehouse_address:
                            warehouse_address = {
                                'full_name': 'YuuSell Logistics Warehouse',
                                'street_address': '123 Warehouse St',
                                'city': 'Los Angeles',
                                'state_province': 'CA',
                                'postal_code': '90001',
                                'country': 'US',
                                'phone': '+1-555-123-4567',
                                'email': 'warehouse@logistics.yuusell.com'
                            }
                        
                        # Calculate chargeable weight
                        dim_weight = calculator.calculate_dimensional_weight(
                            dimensions.get('length', 10),
                            dimensions.get('width', 10),
                            dimensions.get('height', 10),
                            5000  # Air freight divisor
                        )
                        chargeable_weight = max(Decimal(str(weight)), dim_weight)
                        
                        # Calculate volume
                        length_m = Decimal(str(dimensions.get('length', 10))) / Decimal('100')
                        width_m = Decimal(str(dimensions.get('width', 10))) / Decimal('100')
                        height_m = Decimal(str(dimensions.get('height', 10))) / Decimal('100')
                        volume_cbm = length_m * width_m * height_m
                        
                        # Get quote data for easyship_rate_id if available
                        quote_data = quote.quote_data or {}
                        easyship_rate_id = None
                        if quote_data.get('is_international_parcel'):
                            leg1 = quote_data.get('leg1_easyship', {})
                            if leg1:
                                easyship_rate_id = leg1.get('easyship_rate_id') or leg1.get('rate_id')
                        elif quote_data.get('easyship_rate_id'):
                            easyship_rate_id = quote_data.get('easyship_rate_id')
                        elif quote_data.get('rate_id'):
                            easyship_rate_id = quote_data.get('rate_id')
                        
                        # Store easyship_rate_id in origin_address for later use
                        origin_address = warehouse_address.copy()
                        if easyship_rate_id:
                            origin_address['easyship_rate_id'] = easyship_rate_id
                        origin_address['declared_value'] = float(quote.product_cost)
                        origin_address['dimensions'] = dimensions
                        origin_address['description'] = buying_request.product_name or buying_request.product_description[:100]
                        
                        # Create shipment (warehouse to destination)
                        shipment = LogisticsShipment.objects.create(
                            user=buying_request.user,
                            shipment_number=f"BS-{uuid.uuid4().hex[:8].upper()}",
                            source_type='buy_and_ship',
                            shipping_category=shipping_category,
                            transport_mode=quote.shipping_mode,
                            service_level=quote.shipping_service_name or 'Standard',
                            actual_weight=Decimal(str(weight)),
                            chargeable_weight=chargeable_weight,
                            actual_volume=volume_cbm if volume_cbm > 0 else None,
                            origin_address=origin_address,
                            destination_address=destination_address,
                            shipping_cost=quote.shipping_cost,
                            pickup_cost=Decimal('0'),  # No pickup needed (already at warehouse)
                            insurance_cost=Decimal(str(quote.product_cost)) * Decimal('0.01'),  # 1% insurance
                            service_fee=Decimal('0'),
                            total_cost=quote.shipping_cost,  # Only shipping cost (product costs already paid)
                            status='payment_received',
                            carrier=quote_data.get('carrier', ''),
                            is_local_shipping=calculator.is_local_shipping('US', shipping_address.get('country', 'US')),
                        )
                        
                        # Link shipment to quote and buying request
                        quote.shipment = shipment
                        quote.save()
                        buying_request.shipment = shipment
                        buying_request.save()
                        
                        # Create Package instance for this buy-and-ship request
                        # Package will be updated when it arrives at warehouse
                        from logistics.models import Package
                        
                        # Generate reference number if not already set
                        if not buying_request.reference_number:
                            buying_request.generate_reference_number()
                            buying_request.save()
                        
                        # Create package (will be updated when received at warehouse)
                        package, created = Package.objects.get_or_create(
                            reference_number=buying_request.reference_number,
                            defaults={
                                'user': buying_request.user,
                                'weight': Decimal(str(weight)),
                                'length': Decimal(str(dimensions.get('length', 10))),
                                'width': Decimal(str(dimensions.get('width', 10))),
                                'height': Decimal(str(dimensions.get('height', 10))),
                                'declared_value': quote.product_cost,
                                'description': buying_request.product_name or buying_request.product_description[:200],
                                'status': 'pending',  # Will be updated to 'received' when warehouse receives it
                                'shipment': shipment,  # Link to shipment
                            }
                        )
                        
                        # Check if this is a vehicle quote
                        is_vehicle = shipping_category == 'vehicle'
                        
                        if is_vehicle:
                            # Create Vehicle instance for vehicle quotes
                            from vehicles.models import Vehicle
                            from logistics.models import PickupRequest
                            
                            # Extract vehicle data from buying request and quote
                            vehicle_data = approximate_data.get('vehicle_data', {})
                            
                            # Get dimensions from quote or approximate data
                            vehicle_dimensions = dimensions or approximate_data.get('dimensions', {})
                            vehicle_weight = weight or approximate_data.get('weight', 1500)  # Default 1500kg for car
                            
                            # Parse product name to extract make/model/year if possible
                            product_name = buying_request.product_name or ''
                            make_model_year = product_name.split() if product_name else []
                            
                            # Try to extract year, make, model from product_name (e.g., "2020 Toyota Camry")
                            vehicle_year = vehicle_data.get('year')
                            vehicle_make = vehicle_data.get('make')
                            vehicle_model = vehicle_data.get('model')
                            
                            if not vehicle_year and len(make_model_year) > 0:
                                try:
                                    vehicle_year = int(make_model_year[0])
                                    if len(make_model_year) > 1:
                                        vehicle_make = make_model_year[1]
                                    if len(make_model_year) > 2:
                                        vehicle_model = ' '.join(make_model_year[2:])
                                except (ValueError, IndexError):
                                    pass
                            
                            # Create Vehicle instance
                            vehicle = Vehicle.objects.create(
                                user=buying_request.user,
                                status='payment_received',  # Skip document signing for buy-and-ship vehicles
                                make=vehicle_make or product_name.split()[0] if product_name else 'Unknown',
                                model=vehicle_model or 'Vehicle',
                                year=vehicle_year or 2020,
                                vin=vehicle_data.get('vin', ''),
                                vehicle_type=vehicle_data.get('vehicle_type', 'car'),
                                shipping_method=vehicle_data.get('shipping_method', 'roro'),
                                condition=vehicle_data.get('condition', 'running'),
                                length=Decimal(str(vehicle_dimensions.get('length', 450))),  # Default car length in cm
                                width=Decimal(str(vehicle_dimensions.get('width', 180))),  # Default car width in cm
                                height=Decimal(str(vehicle_dimensions.get('height', 150))),  # Default car height in cm
                                weight=Decimal(str(vehicle_weight)),
                                origin_address=origin_address,  # Warehouse address (vehicle shipped to warehouse by marketplace)
                                destination_address=destination_address,  # User's shipping address
                                quote_amount=quote.shipping_cost,
                                pickup_cost=Decimal('0'),  # No pickup cost (marketplace ships to warehouse)
                                total_amount=quote.total_cost,
                                payment_paid=True,
                                # Skip document signing for buy-and-ship
                                documents_signed={'buy_and_ship': True, 'buying_request_id': buying_request.id},
                                documents_signed_at=timezone.now(),
                            )
                            
                            # Link vehicle to shipment
                            vehicle.shipment = shipment
                            vehicle.save()
                            
                            # Create PickupRequest for vehicle
                            # Note: For buy-and-ship, vehicle is already at warehouse, but we create pickup request for tracking
                            pickup_request = PickupRequest.objects.create(
                                shipment=shipment,
                                pickup_address=origin_address,  # Warehouse address
                                contact_name=origin_address.get('full_name', 'Warehouse Manager'),
                                contact_phone=origin_address.get('phone', ''),
                                special_instructions=f'Vehicle purchased through buy-and-ship service (Request #{buying_request.id}). Vehicle is already at warehouse, ready for shipping to destination.',
                                expected_weight=vehicle.weight,
                                expected_dimensions={
                                    'length': float(vehicle.length),
                                    'width': float(vehicle.width),
                                    'height': float(vehicle.height),
                                },
                                status='scheduled',  # Already at warehouse, ready for shipping
                            )
                            
                            # Update vehicle status to pickup_scheduled
                            vehicle.status = 'pickup_scheduled'
                            vehicle.save()
                            
                            logger.info(f"Created Vehicle {vehicle.id} and PickupRequest {pickup_request.id} for buy-and-ship quote {quote.id}")
                        else:
                            # Create Package instance for this buy-and-ship request (non-vehicle)
                            # Link package to shipment (ManyToMany)
                            shipment.packages.add(package)
                            
                            # Link package to buying request
                            buying_request.package = package
                            buying_request.save()
                        
                        # Link payment to shipment
                        payment.shipment = shipment
                        payment.save()
                        
                        # Send emails
                        try:
                            send_payment_receipt_user_email(buying_request, quote, payment)
                            send_payment_received_agent_email(buying_request, quote, payment)
                        except Exception as e:
                            pass
                    except BuyAndShipQuote.DoesNotExist:
                        pass
                    except Exception as e:
                        # Log error but don't fail webhook
                        
                        logger.error(f"Error creating shipment for buy-and-ship quote: {str(e)}")
                        
                        logger.error(traceback.format_exc())
            
            # Handle vehicle shipping payment
            is_vehicle_shipping = (
                payment.payment_type == 'vehicle_shipping' or 
                payment.metadata.get('payment_type') == 'vehicle_shipping' or
                payment.vehicle is not None
            )
            
            if is_vehicle_shipping and payment.vehicle:
                from vehicles.models import Vehicle
                from vehicles.services.email_service import send_condition_report_signed_email
                from logistics.models import LogisticsShipment, TransportMode, TrackingUpdate
                from logistics.services.pricing_calculator import PricingCalculator
                from decimal import Decimal
                
                try:
                    vehicle = payment.vehicle
                    vehicle.payment_paid = True
                    vehicle.status = 'payment_received'
                    vehicle.save()
                    
                    # Create LogisticsShipment for vehicle
                    calculator = PricingCalculator()
                    
                    # Determine shipping category
                    shipping_category = 'vehicle'
                    
                    # Get transport mode based on shipping method
                    transport_mode = None
                    if vehicle.shipping_method == 'roro':
                        transport_mode = TransportMode.objects.filter(type='sea').first()
                    elif 'container' in vehicle.shipping_method:
                        transport_mode = TransportMode.objects.filter(type='sea').first()
                    else:
                        transport_mode = TransportMode.objects.filter(type='sea').first()
                    
                    if not transport_mode:
                        transport_mode = TransportMode.objects.first()
                    
                    # Calculate chargeable weight (use actual weight for vehicles)
                    chargeable_weight = Decimal(str(vehicle.weight))
                    
                    # Calculate volume
                    length_m = vehicle.length / Decimal('100')
                    width_m = vehicle.width / Decimal('100')
                    height_m = vehicle.height / Decimal('100')
                    volume_cbm = length_m * width_m * height_m
                    
                    # Create shipment
                    shipment = LogisticsShipment.objects.create(
                        user=vehicle.user,
                        source_type='vehicle',
                        shipping_category=shipping_category,
                        transport_mode=transport_mode,
                        actual_weight=chargeable_weight,
                        chargeable_weight=chargeable_weight,
                        actual_volume=volume_cbm,
                        origin_address=vehicle.origin_address,
                        destination_address=vehicle.destination_address,
                        shipping_cost=vehicle.quote_amount,
                        pickup_cost=vehicle.pickup_cost,
                        total_cost=vehicle.total_amount,
                        status='payment_received',
                    )
                    
                    # Link vehicle to shipment
                    vehicle.shipment = shipment
                    vehicle.status = 'pickup_scheduled'
                    vehicle.save()
                    
                    # Link payment to shipment
                    payment.shipment = shipment
                    payment.save()
                    
                    # Create TrackingUpdate
                    TrackingUpdate.objects.create(
                        shipment=shipment,
                        status='payment_received',
                        location=vehicle.origin_address.get('city', '') if vehicle.origin_address else '',
                        timestamp=timezone.now(),
                        source='webhook',
                        raw_data={
                            'payment_id': payment.payment_id,
                            'vehicle_id': vehicle.id,
                            'status': 'payment_received',
                        }
                    )
                    
                except Exception as e:
                    
                    logger.error(f"Error processing vehicle shipping payment: {str(e)}")
                    
                    logger.error(traceback.format_exc())
            
            # If payment is for a shipment, update shipment status and generate label
            elif payment.shipment:
                from logistics.models import LogisticsShipment, Package, TrackingUpdate
                from logistics.services.easyship_service import EasyShipService
                from logistics.services.pricing_calculator import PricingCalculator
                
                shipment = payment.shipment
                old_status = shipment.status
                shipment.status = 'payment_received'
                shipment.save()
                
                # Create TrackingUpdate for status change

                TrackingUpdate.objects.create(
                    shipment=shipment,
                    status='payment_received',
                    location=shipment.origin_address.get('city', '') if shipment.origin_address else '',
                    timestamp=timezone.now(),
                    source='webhook',
                    raw_data={
                        'payment_id': payment.payment_id,
                        'old_status': old_status,
                        'new_status': 'payment_received',
                    }
                )
                
                # Create Package for ship_my_items (if not vehicle)
                if shipment.source_type == 'ship_my_items' and shipment.shipping_category != 'vehicle':
                    try:
                        # Check if package already exists for this shipment
                        package = Package.objects.filter(shipment=shipment).first()
                        
                        if not package:
                            # Create new package
                            package = Package.objects.create(
                                user=shipment.user,
                                shipment=shipment,
                                weight=shipment.actual_weight,
                                length=shipment.origin_address.get('dimensions', {}).get('length') if shipment.origin_address.get('dimensions') else None,
                                width=shipment.origin_address.get('dimensions', {}).get('width') if shipment.origin_address.get('dimensions') else None,
                                height=shipment.origin_address.get('dimensions', {}).get('height') if shipment.origin_address.get('dimensions') else None,
                                declared_value=shipment.origin_address.get('declared_value', 0) if shipment.origin_address else 0,
                                status='pending',
                                description=shipment.origin_address.get('description', '') if shipment.origin_address else '',
                            )
                            
                            # Add package to shipment's packages ManyToMany (if exists)
                            if hasattr(shipment, 'packages'):
                                shipment.packages.add(package)
                            
                            logger.info(f"Created Package {package.reference_number} for shipment {shipment.shipment_number}")
                    except Exception as e:
                        
                        logger.error(f"Error creating package for ship_my_items: {str(e)}")
                        
                        logger.error(traceback.format_exc())
                
                # Get package reference number if package exists
                package_reference_number = None
                package = Package.objects.filter(shipment=shipment).first()
                if package:
                    package_reference_number = package.reference_number
                
                # Generate label based on shipping type
                easyship = EasyShipService()
                calculator = PricingCalculator()
                
                # Prepare parcels
                parcels = [{
                    'total_actual_weight': float(shipment.actual_weight),
                    'box': {
                        'length': float(shipment.origin_address.get('dimensions', {}).get('length', 10)),
                        'width': float(shipment.origin_address.get('dimensions', {}).get('width', 10)),
                        'height': float(shipment.origin_address.get('dimensions', {}).get('height', 10)),
                    },
                    'items': [{
                        'description': shipment.origin_address.get('description', 'General Merchandise'),
                        'hs_code': shipment.origin_address.get('hs_code', '999999'),
                        'sku': shipment.origin_address.get('sku', 'GEN'),
                        'quantity': 1,
                        'value': float(shipment.origin_address.get('declared_value', 0)),
                        'currency': 'USD'
                    }]
                }]
                
                if shipment.is_local_shipping:
                    # Local shipping: create EasyShip shipment directly (origin → destination)
                    easyship_result = easyship.create_shipment(
                        rate_id=shipment.origin_address.get('easyship_rate_id'),
                        origin_address=shipment.origin_address,
                        destination_address=shipment.destination_address,
                        parcels=parcels,
                        package_reference_number=package_reference_number
                    )
                    if easyship_result:
                        shipment.easyship_shipment_id = easyship_result.get('shipment_id', '')
                        shipment.tracking_number = easyship_result.get('tracking_number', '')
                        shipment.local_carrier_tracking_number = easyship_result.get('tracking_number', '')
                        shipment.easyship_label_url = easyship_result.get('label_url', '')
                        shipment.status = 'processing'
                        shipment.save()
                elif shipment.pickup_cost > 0:
                    # Pickup required: create EasyShip shipment (origin → warehouse)
                    # Get warehouse address
                    warehouse_address = {
                        'full_name': 'YuuSell Logistics Warehouse',
                        'street_address': '123 Warehouse St',
                        'city': 'Los Angeles',
                        'state_province': 'CA',
                        'postal_code': '90001',
                        'country_alpha2': 'US',
                        'phone': '+1-555-123-4567'
                    }
                    easyship_result = easyship.create_shipment(
                        rate_id=shipment.origin_address.get('easyship_rate_id'),
                        origin_address=shipment.origin_address,
                        destination_address=warehouse_address,
                        parcels=parcels,
                        package_reference_number=package_reference_number
                    )
                    if easyship_result:
                        shipment.easyship_shipment_id = easyship_result.get('shipment_id', '')
                        shipment.local_carrier_tracking_number = easyship_result.get('tracking_number', '')
                        shipment.easyship_label_url = easyship_result.get('label_url', '')
                        shipment.status = 'processing'
                        shipment.save()
                # For non-pickup heavy items, label will be generated when package arrives at warehouse
                
        except Payment.DoesNotExist:
            pass
    
    return Response({'status': 'success'})

