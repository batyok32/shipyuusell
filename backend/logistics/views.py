from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from decimal import Decimal
import json
import logging
from .models import (
    Package, LogisticsShipment, Country, TransportMode,
    QuoteRequest, TrackingUpdate, ShippingRoute, PickupRequest
)
from .serializers import (
    PackageSerializer, 
    LogisticsShipmentSerializer, 
    CountrySerializer,
    TransportModeSerializer
)
from .services.pricing_calculator import PricingCalculator
from .services.easyship_service import EasyShipService
from django.utils import timezone
from datetime import timedelta
import uuid
from datetime import datetime


def is_shipment_paid(shipment):
    """Check if a shipment has a completed payment"""
    from payments.models import Payment
    return Payment.objects.filter(
        shipment=shipment,
        status='completed'
    ).exists()


class PackageViewSet(viewsets.ModelViewSet):
    """Package management"""
    serializer_class = PackageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Package.objects.filter(user=self.request.user).select_related('shipment', 'user').order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_packages(self, request):
        """Get all packages for the current user with details"""
        packages = Package.objects.filter(user=request.user).select_related('shipment', 'user').order_by('-created_at')
        serializer = PackageSerializer(packages, many=True)
        return Response({
            'packages': serializer.data,
            'count': packages.count()
        })


class ShipmentViewSet(viewsets.ModelViewSet):
    """Shipment management"""
    serializer_class = LogisticsShipmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LogisticsShipment.objects.filter(user=self.request.user).prefetch_related('primary_packages')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def packages(self, request, pk=None):
        """Get packages for a shipment"""
        shipment = self.get_object()
        packages = Package.objects.filter(shipment=shipment)
        serializer = PackageSerializer(packages, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_shipping(request):
    """Calculate shipping quotes for all available modes (public access for quotes)"""
    origin_country = request.data.get('origin_country')
    destination_country = request.data.get('destination_country')
    weight = float(request.data.get('weight', 0))
    dimensions = request.data.get('dimensions', {})
    declared_value = float(request.data.get('declared_value', 0))
    items = request.data.get('items')
    shipping_category = request.data.get('shipping_category')
    origin_address = request.data.get('origin_address')  # Optional for pickup calculation
    destination_address = request.data.get('destination_address')  # Required for local shipping
    
    if not all([origin_country, destination_country, weight]):
        return Response(
            {'error': 'Missing required fields: origin_country, destination_country, weight'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # For local shipping, addresses are required for EasyShip API
    is_local = origin_country == destination_country
    if is_local:
        if not origin_address or not destination_address:
            return Response(
                {'error': 'Origin and destination addresses are required for local shipping'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Validate required address fields for EasyShip
        required_fields = ['city', 'state_province', 'postal_code', 'country']
        for field in required_fields:
            if not origin_address.get(field):
                return Response(
                    {'error': f'Origin address missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not destination_address.get(field):
                return Response(
                    {'error': f'Destination address missing required field: {field}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Determine category based on weight if not provided or auto
    if not shipping_category or shipping_category == 'auto':
        if weight < 30:
            shipping_category = 'small_parcel'
        elif weight < 100:
            shipping_category = 'heavy_parcel'
        elif weight < 4000:
            shipping_category = 'ltl_freight'
        else:
            shipping_category = 'ftl_freight'
    
    calculator = PricingCalculator()
    
    # Get warehouse address from database based on origin country and category
    warehouse_address = None
    print(f"Origin country: {origin_country}")
    if origin_country:
        # origin_country_code = origin_country.get('country', 'US')
        warehouse_address = calculator.get_warehouse_address(origin_country, shipping_category)
    print(f"Warehouse address: {warehouse_address}")
    quotes = calculator.get_all_quotes(
        origin_country, destination_country, weight, dimensions, 
        declared_value, items, shipping_category, origin_address, warehouse_address, destination_address
    )
    
    # Store quote request with session ID
    session_id = request.session.session_key or str(uuid.uuid4())
    if not request.session.session_key:
        request.session.create()
        session_id = request.session.session_key
    
    # Determine pickup requirement
    pickup_required = calculator.determine_pickup_required(weight, shipping_category)
    
    # Check if local shipping
    is_local = calculator.is_local_shipping(origin_country, destination_country)
    
    # Determine if YuuSell handles shipping or just EasyShip
    # Rule: If local shipping -> EasyShip only
    #       If cars OR weight > 100kg -> YuuSell handles with local pickup only
    #       Otherwise -> Standard calculation
    is_yuusell_handled = False
    if is_local:
        # Local shipping: YuuSell just provides EasyShip quotes
        is_yuusell_handled = False
    elif shipping_category == 'vehicle' or weight > 100:
        # Cars or heavy items (>100kg): YuuSell handles with own calculation and local pickup only
        is_yuusell_handled = True
        pickup_required = True  # Force pickup for YuuSell-handled shipments
    
    # Extract country codes as strings for database lookup
    origin_country_code = origin_country if isinstance(origin_country, str) else (origin_country.get('country', 'US') if isinstance(origin_country, dict) else 'US')
    destination_country_code = destination_country if isinstance(destination_country, str) else (destination_country.get('country', 'US') if isinstance(destination_country, dict) else 'US')
    
    # Prepare quote_data to store warehouse_address for later use (especially for international parcels)
    quote_data = {
        'quotes': quotes,
        'warehouse_address': warehouse_address,  # Store warehouse address for international parcel label generation
        'origin_country': origin_country_code,
        'destination_country': destination_country_code,
        'shipping_category': shipping_category
    }
    
    # Create or update quote request
    expires_at = timezone.now() + timedelta(hours=settings.QUOTE_REQUEST_EXPIRY_HOURS)
    
    try:
        origin_country_obj = Country.objects.get(code=origin_country_code)
        destination_country_obj = Country.objects.get(code=destination_country_code)
    except Country.DoesNotExist:
        return Response(
            {'error': 'Invalid country code'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    quote_request, created = QuoteRequest.objects.update_or_create(
        session_id=session_id,
        defaults={
            'origin_country': origin_country_obj,
            'destination_country': destination_country_obj,
            'weight': weight,
            'dimensions': dimensions,
            'declared_value': declared_value,
            'shipping_category': shipping_category,
            'pickup_required': pickup_required,
            'quote_data': quote_data,  # Store quotes, warehouse_address, and other metadata
            'expires_at': expires_at,
        }
    )
    
    # Include category-specific metadata in response
    # For local shipping, validate that we have EasyShip rates
    if is_local and not quotes:
        return Response(
            {
                'error': 'No shipping rates available for this route. Please ensure addresses are complete and try again.',
                'quotes': [],
                'shipping_category': shipping_category,
                'quote_request_id': quote_request.id if 'quote_request' in locals() else None,
                'pickup_required': False,
                'is_local_shipping': True,
                'is_yuusell_handled': False,
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    response_data = {
        'quotes': quotes,
        'shipping_category': shipping_category,
        'quote_request_id': quote_request.id,
        'pickup_required': pickup_required,
        'is_local_shipping': is_local,
        'is_yuusell_handled': is_yuusell_handled,  # Indicates if YuuSell handles vs EasyShip only
        'sorted_by': 'price',
    }
    
    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def proceed_with_quote(request):
    """Convert QuoteRequest to LogisticsShipment after user login/proceed"""
    print(f"Proceed with quote request: {request.data}")
    quote_request_id = request.data.get('quote_request_id')
    selected_quote = request.data.get('selected_quote')
    origin_address = request.data.get('origin_address')
    destination_address = request.data.get('destination_address')
    
    if not all([quote_request_id, selected_quote, origin_address, destination_address]):
        print("Missing required fields: quote_request_id, selected_quote, origin_address, destination_address")
        return Response(
            {'error': 'Missing required fields: quote_request_id, selected_quote, origin_address, destination_address'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        quote_request = QuoteRequest.objects.get(id=quote_request_id)
        print(f"Quote request: {quote_request}")
        if quote_request.converted_to_shipment:
            # Find the shipment that was created from this quote request
            shipment = LogisticsShipment.objects.filter(quote_request=quote_request).first()
            if shipment:
                serializer = LogisticsShipmentSerializer(shipment)
                return Response({
                    'already_converted': True,
                    'shipment': serializer.data,
                    'shipment_id': shipment.id,
                    'shipment_number': shipment.shipment_number,
                    'redirect_url': f'/track/{shipment.shipment_number}',  # or '/dashboard'
                    'message': 'This quote request has already been converted to a shipment.'
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Quote request already converted, but shipment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get transport mode
        transport_mode_code = selected_quote.get('transport_mode', 'air')
        try:
            transport_mode = TransportMode.objects.get(code=transport_mode_code)
        except TransportMode.DoesNotExist:
            transport_mode = TransportMode.objects.filter(type='air', is_active=True).first()
        
        # Calculate chargeable weight
        weight = Decimal(str(quote_request.weight))
        dimensions = quote_request.dimensions
        
        calculator = PricingCalculator()
        calc_settings = calculator.get_calculation_settings(None, transport_mode)
        dim_weight = calculator.calculate_dimensional_weight(
            dimensions.get('length', 10),
            dimensions.get('width', 10),
            dimensions.get('height', 10),
            float(calc_settings.dimensional_weight_divisor)
        )
        chargeable_weight = max(weight, dim_weight)
        
        # Calculate volume
        length_m = Decimal(str(dimensions.get('length', 0))) / Decimal('100')
        width_m = Decimal(str(dimensions.get('width', 0))) / Decimal('100')
        height_m = Decimal(str(dimensions.get('height', 0))) / Decimal('100')
        volume_cbm = length_m * width_m * height_m
        
        # Get costs from quote
        total_cost = Decimal(str(selected_quote.get('total', 0)))
        pickup_cost = Decimal(str(selected_quote.get('pickup_cost', 0)))
        
        # Check if local shipping
        is_local = calculator.is_local_shipping(
            quote_request.origin_country.code,
            quote_request.destination_country.code
        )
        print(f"Is local shipping: {is_local}")
       
        
        # Store selected quote with easyship_rate_id in quote_data
        logger = logging.getLogger(__name__)
        if not quote_request.quote_data:
            quote_request.quote_data = {}
        
        # Ensure rate_id is stored at the top level for easy access
        # For international parcels, extract from leg1_easyship
        if selected_quote.get('is_international_parcel'):
            leg1 = selected_quote.get('leg1_easyship', {})
            if leg1:
                rate_id = leg1.get('easyship_rate_id') or leg1.get('rate_id')
                if rate_id:
                    selected_quote['easyship_rate_id'] = rate_id
                # Also extract courier name
                courier_name = leg1.get('carrier')
                if courier_name:
                    selected_quote['courier_name'] = courier_name
        # For local shipping, extract from easyship_rate_data or direct fields
        elif selected_quote.get('is_local_shipping'):
            rate_id = (
                selected_quote.get('easyship_rate_id') or
                selected_quote.get('rate_id')
            )
            # If not found, try to extract from easyship_rate_data
            if not rate_id:
                easyship_rate_data = selected_quote.get('easyship_rate_data', {})
                if isinstance(easyship_rate_data, dict):
                    rate_id = (
                        easyship_rate_data.get('id') or
                        easyship_rate_data.get('easyship_rate_id') or
                        easyship_rate_data.get('rate_id') or
                        easyship_rate_data.get('service_id')
                    )
            if rate_id:
                selected_quote['easyship_rate_id'] = rate_id
                logger.info(f"Extracted rate_id for local shipping: {rate_id}")
        
        quote_request.quote_data['selected_quote'] = selected_quote
        quote_request.save()
        logger.info(f"Stored selected quote with keys: {list(selected_quote.keys())}")
        if selected_quote.get('leg1_easyship'):
            logger.info(f"leg1_easyship has rate_id: {selected_quote.get('leg1_easyship', {}).get('rate_id')}")
            logger.info(f"leg1_easyship has easyship_rate_id: {selected_quote.get('leg1_easyship', {}).get('easyship_rate_id')}")
        
        # Create shipment
        shipment = LogisticsShipment.objects.create(
            user=request.user,
            shipment_number=str(uuid.uuid4())[:8].upper(),
            source_type='ship_my_items',
            shipping_category=quote_request.shipping_category,
            transport_mode=transport_mode,
            service_level=selected_quote.get('service_level', 'Standard'),
            actual_weight=weight,
            chargeable_weight=chargeable_weight,
            actual_volume=volume_cbm if volume_cbm > 0 else None,
            origin_address=origin_address,
            destination_address=destination_address,
            shipping_cost=total_cost - pickup_cost,
            pickup_cost=pickup_cost,
            insurance_cost=Decimal(str(quote_request.declared_value)) * Decimal('0.01'),  # 1% insurance
            service_fee=Decimal('0'),
            total_cost=total_cost,
            status='quote_approved',
            carrier=selected_quote.get('carrier', ''),
            quote_request=quote_request,
            is_local_shipping=is_local,
        )
        
        # Create pickup request if pickup is required
        if quote_request.pickup_required and pickup_cost > 0:
            PickupRequest.objects.create(
                shipment=shipment,
                pickup_address=origin_address,
                contact_name=origin_address.get('full_name', ''),
                contact_phone=origin_address.get('phone', ''),
                special_instructions=origin_address.get('special_instructions', ''),
                expected_weight=weight,
                expected_dimensions=dimensions,
                status='pending'
            )
        
        # Mark quote request as converted
        quote_request.converted_to_shipment = True
        quote_request.save()
        
        serializer = LogisticsShipmentSerializer(shipment)
        return Response({
            'shipment': serializer.data,
            'shipment_id': shipment.id,
            'message': 'Shipment created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except QuoteRequest.DoesNotExist:
        return Response(
            {'error': 'Quote request not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to create shipment: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request):
    """Create Stripe checkout session for shipment payment"""
    try:
        import stripe
    except ImportError as e:
        return Response(
            {'error': f'Stripe library is not installed. Please install stripe package. Error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    shipment_id = request.data.get('shipment_id')
    success_url = request.data.get('success_url', f'{settings.FRONTEND_URL}/quote/payment/success')
    cancel_url = request.data.get('cancel_url', f'{settings.FRONTEND_URL}/quote/payment/cancel')
    
    if not shipment_id:
        return Response(
            {'error': 'Missing shipment_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY:
        return Response(
            {'error': 'Stripe is not configured. Please set STRIPE_SECRET_KEY in settings.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        shipment = LogisticsShipment.objects.get(id=shipment_id, user=request.user)
        
        if shipment.status != 'quote_approved':
            return Response(
                {'error': 'Shipment must be approved before payment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Use stripe.checkout.Session.create() directly (same as payments/views.py)
        # Note: stripe.checkout may appear as None in introspection but still works when accessed
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'YuuSell Shipping - {shipment.shipment_number}',
                        },
                        'unit_amount': int(float(shipment.total_cost) * 100),  # Convert to cents
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{success_url}?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=cancel_url,
                metadata={
                    'user_id': str(request.user.id),
                    'shipment_id': str(shipment.id),
                    'payment_type': 'shipping',
                },
                customer_email=request.user.email,
            )
        except AttributeError as e:
            # This catches the case where stripe.checkout is None
            return Response(
                {'error': f'Stripe checkout is not available. Please ensure stripe package is installed: pip install stripe. Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update shipment status
        shipment.status = 'payment_pending'
        shipment.save()
        
        # Create payment record
        from payments.models import Payment
        payment = Payment.objects.create(
            user=request.user,
            stripe_checkout_session_id=checkout_session.id,
            amount=shipment.total_cost,
            currency='USD',
            payment_type='shipping',
            shipment=shipment,
            metadata={'shipment_id': str(shipment.id)},
            status='pending'
        )
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'payment_id': payment.payment_id
        })
        
    except LogisticsShipment.DoesNotExist:
        return Response(
            {'error': 'Shipment not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except stripe.error.StripeError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_shipment_label(request, shipment_id):
    """Generate shipping label via EasyShip for a shipment"""
    try:
        shipment = LogisticsShipment.objects.get(id=shipment_id, user=request.user)
        
        # Check if label is already generating
        if shipment.status == 'label_generating':
            return Response(
                {'error': 'Label generation is already in progress. Please wait for the webhook notification.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if label already exists
        if shipment.easyship_label_url:
            return Response(
                {'error': 'Label has already been generated for this shipment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if shipment is paid
        if not is_shipment_paid(shipment):
            return Response(
                {'error': 'Payment is required before generating a shipping label. Please complete payment for your quote first.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        if shipment.status not in ['quote_approved', 'payment_received', 'processing']:
            return Response(
                {'error': 'Shipment must be approved and paid before generating label'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        easyship = EasyShipService()
        
        # Prepare parcels data - use dimensions from origin_address or default
        dimensions = shipment.origin_address.get('dimensions', {})
        if not dimensions:
            # Fallback: try to get from quote_request or use defaults
            if shipment.quote_request:
                dimensions = shipment.quote_request.dimensions or {}
        
        # Calculate declared value
        declared_value = float(shipment.origin_address.get('declared_value', 0))
        if shipment.quote_request and declared_value == 0:
            declared_value = float(shipment.quote_request.declared_value or 0)
        declared_value = max(declared_value, 1.0)
        
        parcels = [{
            'total_actual_weight': float(shipment.actual_weight),
            'box': None,  # Can be None or box object
            'items': [{
                'description': shipment.origin_address.get('description', 'General Merchandise'),
                'hs_code': shipment.origin_address.get('hs_code', '999999'),
                'sku': shipment.origin_address.get('sku', 'GEN'),
                'quantity': 1,
                'dimensions': {
                    'length': dimensions.get('length', 10),
                    'width': dimensions.get('width', 10),
                    'height': dimensions.get('height', 10),
                },
                'actual_weight': float(shipment.actual_weight),
                'declared_customs_value': declared_value,
                'declared_currency': 'USD',
                'origin_country_alpha2': shipment.origin_address.get('country_alpha2') or shipment.origin_address.get('country', 'US'),
                'category': None,
                'contains_battery_pi966': False,
                'contains_battery_pi967': False,
                'contains_liquids': False
            }]
        }]
        print("Request daata", request.data)
        print("Qutoe request", shipment.quote_request)
        # Get rate_id from quote_data or request
        rate_id = request.data.get('easyship_rate_id')
        
        # Debug: Log what we're checking
        logger = logging.getLogger(__name__)
        logger.info(f"Generating label for shipment {shipment_id}, has quote_request: {shipment.quote_request is not None}")
        
        if not rate_id and shipment.quote_request:
            # Try to get rate_id from quote_data
            quote_data = shipment.quote_request.quote_data or {}
            logger.info(f"Quote data keys: {list(quote_data.keys())}")
            logger.info(f"Full quote_data: {json.dumps(quote_data, indent=2, default=str)}")
            
            # Try to get selected_quote
            selected_quote = quote_data.get('selected_quote', {})
            if not selected_quote or not isinstance(selected_quote, dict) or len(selected_quote) == 0:
                # Maybe selected_quote wasn't stored, try to find it in quotes array
                quotes = quote_data.get('quotes', [])
                logger.info(f"Found {len(quotes)} quotes in quote_data, trying to find selected one")
                # If there's only one quote, use it; otherwise we need the rate_id from request
                if len(quotes) == 1:
                    selected_quote = quotes[0]
                    logger.info(f"Using only available quote with keys: {list(selected_quote.keys())}")
                else:
                    logger.warning(f"Multiple quotes found but no selected_quote stored. Need rate_id in request.")
            else:
                logger.info(f"Selected quote keys: {list(selected_quote.keys())}")
            
            # Try multiple possible field names - the rate ID should be in the quote
            if selected_quote:
                # For international parcels, check leg1_easyship first
                leg1_easyship = selected_quote.get('leg1_easyship', {})
                if isinstance(leg1_easyship, dict) and leg1_easyship:
                    logger.info(f"Checking leg1_easyship for rate_id. Keys: {list(leg1_easyship.keys())}")
                    logger.info(f"leg1_easyship.easyship_rate_id: {leg1_easyship.get('easyship_rate_id')}")
                    logger.info(f"leg1_easyship.rate_id: {leg1_easyship.get('rate_id')}")
                    logger.info(f"leg1_easyship.id: {leg1_easyship.get('id')}")
                    
                    # Try to get rate_id from leg1_easyship direct fields first
                    rate_id = (
                        leg1_easyship.get('easyship_rate_id') or
                        leg1_easyship.get('rate_id') or
                        leg1_easyship.get('id')
                    )
                    
                    # If not found, try from easyship_rate_data in leg1 (this is the full rate object from EasyShip)
                    if not rate_id:
                        leg1_rate_data = leg1_easyship.get('easyship_rate_data', {})
                        logger.info(f"Checking easyship_rate_data. Type: {type(leg1_rate_data)}, Is dict: {isinstance(leg1_rate_data, dict)}")
                        if isinstance(leg1_rate_data, dict) and leg1_rate_data:
                            logger.info(f"easyship_rate_data keys: {list(leg1_rate_data.keys())}")
                            logger.info(f"easyship_rate_data.get('id'): {leg1_rate_data.get('id')}")
                            rate_id = (
                                leg1_rate_data.get('id') or
                                leg1_rate_data.get('easyship_rate_id') or
                                leg1_rate_data.get('rate_id')
                            )
                            logger.info(f"Rate ID extracted from easyship_rate_data: {rate_id}")
                        
                        # If still not found, check courier_service for an ID
                        if not rate_id:
                            courier_service = leg1_easyship.get('courier_service', {})
                            if isinstance(courier_service, dict):
                                rate_id = courier_service.get('id')
                                logger.info(f"Rate ID from courier_service.id: {rate_id}")
                    
                    if rate_id:
                        logger.info(f"✓ Found rate_id in leg1_easyship: {rate_id}")
                    else:
                        logger.warning(f"✗ Rate ID not found in leg1_easyship. Full leg1_easyship: {json.dumps(leg1_easyship, indent=2, default=str)}")
                
                # If still not found, check top-level quote fields
                if not rate_id:
                    # Check if there's a nested easyship_rate_data with the id
                    easyship_rate_data = selected_quote.get('easyship_rate_data', {})
                    if isinstance(easyship_rate_data, dict):
                        rate_id = (
                            easyship_rate_data.get('id') or
                            easyship_rate_data.get('easyship_rate_id') or
                            easyship_rate_data.get('rate_id') or
                            easyship_rate_data.get('service_id')  # For local shipping, rate ID might be in service_id
                        )
                        if rate_id:
                            logger.info(f"Found rate_id in easyship_rate_data: {rate_id}")
                    if not rate_id:
                        # Try direct fields
                        rate_id = (
                            selected_quote.get('easyship_rate_id') or
                            selected_quote.get('id') or
                            selected_quote.get('rate_id') or
                            selected_quote.get('service_id') or  # Also check service_id at top level
                            quote_data.get('easyship_rate_id')  # Sometimes it's at the root level
                        )
                        logger.info(f"Extracted rate_id from direct fields: {rate_id}")
            
            if not rate_id:
                logger.warning(f"Could not extract rate_id. Selected quote keys: {list(selected_quote.keys()) if selected_quote else 'No selected quote'}")
                if selected_quote and selected_quote.get('leg1_easyship'):
                    leg1 = selected_quote.get('leg1_easyship', {})
                    logger.warning(f"leg1_easyship keys: {list(leg1.keys())}")
                    logger.warning(f"leg1_easyship values: easyship_rate_id={leg1.get('easyship_rate_id')}, rate_id={leg1.get('rate_id')}, id={leg1.get('id')}")
                    if leg1.get('easyship_rate_data'):
                        logger.warning(f"easyship_rate_data keys: {list(leg1.get('easyship_rate_data', {}).keys()) if isinstance(leg1.get('easyship_rate_data'), dict) else 'Not a dict'}")
        
        # Check if this is an EasyShip shipment (local shipping or has EasyShip carrier)
        is_easyship_shipment = (
            shipment.is_local_shipping or 
            shipment.carrier and 'easyship' in shipment.carrier.lower()
        )
        
        if not rate_id:
            # If it's not an EasyShip shipment, we might not need a rate_id
            # But for now, we require it for label generation
            error_msg = (
                'EasyShip rate ID is required to generate label. '
                'Please provide easyship_rate_id in request body or ensure the selected quote includes it. '
                f'Shipment quote_request: {shipment.quote_request.id if shipment.quote_request else "None"}, '
                f'Quote data available: {shipment.quote_request.quote_data is not None if shipment.quote_request else False}'
            )
            logger.error(error_msg)
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get courier name from selected quote
        courier_name = None
        if shipment.quote_request:
            quote_data = shipment.quote_request.quote_data or {}
            selected_quote = quote_data.get('selected_quote', {})
            
            # For international parcels, get courier name from leg1_easyship
            leg1_easyship = selected_quote.get('leg1_easyship', {})
            if isinstance(leg1_easyship, dict) and leg1_easyship:
                # Try to get from leg1_easyship courier_service
                leg1_courier_service = leg1_easyship.get('courier_service', {})
                if isinstance(leg1_courier_service, dict):
                    courier_name = (
                        leg1_courier_service.get('umbrella_name') or
                        leg1_courier_service.get('name') or
                        leg1_easyship.get('carrier')
                    )
                else:
                    courier_name = leg1_easyship.get('carrier')
            
            # If not found, try top-level quote fields
            if not courier_name:
                # Try different possible fields for courier name
                # EasyShip rates have courier_service with umbrella_name or name
                courier_service = selected_quote.get('courier_service', {})
                if isinstance(courier_service, dict):
                    courier_name = (
                        courier_service.get('umbrella_name') or
                        courier_service.get('name') or
                        selected_quote.get('courier_name') or
                        selected_quote.get('carrier')
                    )
                else:
                    courier_name = (
                        selected_quote.get('courier_name') or 
                        selected_quote.get('carrier') or
                        selected_quote.get('umbrella_name') or
                        shipment.carrier
                    )
            
            logger.info(f"Extracted courier_name: {courier_name}")
        
        # Determine destination address for EasyShip
        # For international parcels, EasyShip destination should be the warehouse, not final destination
        easyship_destination_address = shipment.destination_address
        is_international_parcel = False
        
        if shipment.quote_request:
            quote_data = shipment.quote_request.quote_data or {}
            selected_quote = quote_data.get('selected_quote', {})
            is_international_parcel = selected_quote.get('is_international_parcel', False)
            
            if is_international_parcel:
                logger.info("International parcel detected - using warehouse address as EasyShip destination")
                # Get warehouse address from quote_data if stored, or calculate it
                warehouse_address = quote_data.get('warehouse_address')
                
                if not warehouse_address:
                    # Calculate warehouse address from origin country and category
                    from logistics.services.pricing_calculator import PricingCalculator
                    calculator = PricingCalculator()
                    origin_country = shipment.origin_address.get('country_alpha2') or shipment.origin_address.get('country', 'US')
                    shipping_category = shipment.shipping_category or 'small_parcel'
                    warehouse_address = calculator.get_warehouse_address(origin_country, shipping_category)
                    logger.info(f"Calculated warehouse address: {warehouse_address}")
                
                if warehouse_address:
                    # Convert warehouse address format to match destination_address format
                    # Ensure all required fields have valid defaults, especially phone
                    warehouse_phone = warehouse_address.get('phone', '').strip()
                    if not warehouse_phone:
                        # Use default phone number for warehouse if not provided
                        warehouse_phone = '+1234567890'  # Default warehouse phone
                        logger.warning(f"Warehouse address missing phone number, using default: {warehouse_phone}")
                    
                    easyship_destination_address = {
                        'full_name': warehouse_address.get('full_name', 'YuuSell Logistics Warehouse'),
                        'company': warehouse_address.get('company', 'YuuSell Logistics Warehouse'),
                        'street_address': warehouse_address.get('street_address', ''),
                        'street_address_2': warehouse_address.get('street_address_2', ''),
                        'city': warehouse_address.get('city', ''),
                        'state_province': warehouse_address.get('state_province', ''),
                        'postal_code': warehouse_address.get('postal_code', ''),
                        'country_alpha2': warehouse_address.get('country', ''),
                        'country': warehouse_address.get('country', ''),
                        'phone': warehouse_phone,  # Use validated phone with default
                        'email': warehouse_address.get('email', 'warehouse@logistics.yuusell.com')
                    }
                    logger.info(f"Using warehouse address as EasyShip destination: {easyship_destination_address}")
                else:
                    logger.warning("International parcel but no warehouse address found - using final destination (may cause issues)")
            else:
                logger.info("Local shipping - using final destination address")
        
        # Get package reference number if package exists for this shipment
        package_reference_number = None
        package = Package.objects.filter(shipment=shipment).first()
        if package:
            package_reference_number = package.reference_number
            logger.info(f"Using package reference number {package_reference_number} as contact_name for EasyShip")
        
        # Create shipment in EasyShip
        easyship_result = easyship.create_shipment(
            rate_id=rate_id,
            origin_address=shipment.origin_address,
            destination_address=easyship_destination_address,
            parcels=parcels,
            courier_name=courier_name,
            package_reference_number=package_reference_number
        )
        
        if not easyship_result:
            return Response(
                {'error': 'Failed to create shipment in EasyShip'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update shipment with EasyShip data
        shipment.easyship_shipment_id = easyship_result.get('shipment_id', '')
        shipment.tracking_number = easyship_result.get('tracking_number', '')
        
        # If label was created synchronously, set it; otherwise wait for webhook
        if easyship_result.get('label_url'):
            shipment.easyship_label_url = easyship_result.get('label_url', '')
            shipment.status = 'processing'
        else:
            # Label generation is asynchronous, wait for webhook
            shipment.status = 'label_generating'
        
        shipment.save()
        
        serializer = LogisticsShipmentSerializer(shipment)
        return Response({
            'shipment': serializer.data,
            'label_url': easyship_result.get('label_url'),
            'tracking_number': easyship_result.get('tracking_number'),
            'message': 'Label generated successfully'
        })
        
    except LogisticsShipment.DoesNotExist:
        return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            {'error': f'Failed to generate label: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_warehouse_address(request):
    """Get user's warehouse address based on user's location or default"""
    from logistics.models import Warehouse
    from logistics.services.pricing_calculator import PricingCalculator
    
    # Try to get user's country from their addresses or preferences
    user_country_code = 'US'  # Default
    shipping_category = request.GET.get('category', 'all')  # Optional category filter
    
    # Try to get country from user's shipments or quote requests
    # If not available, default to US
    from logistics.models import LogisticsShipment, QuoteRequest
    # First try to get from shipments (which have user field)
    user_shipment = LogisticsShipment.objects.filter(user=request.user).order_by('-created_at').first()
    if user_shipment and user_shipment.destination_address:
        # Check for country_alpha2 first (as used by EasyShip), then country
        destination_country = user_shipment.destination_address.get('country_alpha2') or user_shipment.destination_address.get('country')
        if destination_country:
            user_country_code = destination_country
    # Fallback: try to get from quote requests through shipments
    elif user_shipment and user_shipment.quote_request:
        if user_shipment.quote_request.destination_country:
            user_country_code = user_shipment.quote_request.destination_country.code
    
    # Get warehouse from database
    calculator = PricingCalculator()
    warehouse_address = calculator.get_warehouse_address(user_country_code, shipping_category)
    
    if not warehouse_address:
        # Fallback: Get any active warehouse in the country
        from logistics.models import Country, Warehouse
        try:
            country_obj = Country.objects.get(code=user_country_code)
            warehouse = Warehouse.objects.filter(country=country_obj, is_active=True).first()
            if warehouse:
                warehouse_address = {
                    'full_name': warehouse.full_name,
                    'company': warehouse.company,
                    'street_address': warehouse.street_address,
                    'street_address_2': warehouse.street_address_2 or '',
                    'city': warehouse.city,
                    'state_province': warehouse.state_province or '',
                    'postal_code': warehouse.postal_code,
                    'country': warehouse.country.code,
                    'phone': warehouse.phone or '',
                }
        except Country.DoesNotExist:
            pass
    
    if not warehouse_address:
        # Final fallback: Default warehouse address
        return Response({
            'full_name': 'YuuSell Logistics Warehouse',
            'company': 'YuuSell Logistics Warehouse',
            'street_address': '123 Warehouse St',
            'street_address_2': '',
            'city': 'Los Angeles',
            'state_province': 'CA',
            'postal_code': '90001',
            'country': 'US',
            'phone': '+1-555-123-4567',
            'warehouse_id': request.user.warehouse_id if hasattr(request.user, 'warehouse_id') else str(request.user.id).zfill(6)
        })
    
    # Add user's warehouse ID for addressing
    warehouse_address['warehouse_id'] = request.user.warehouse_id if hasattr(request.user, 'warehouse_id') else str(request.user.id).zfill(6)
    
    return Response(warehouse_address)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_warehouse_rates(request):
    """Get EasyShip rates for shipping to warehouse (domestic shipping)"""
    pickup_address = request.data.get('pickup_address')
    weight = float(request.data.get('weight', 0))
    dimensions = request.data.get('dimensions', {})
    declared_value = float(request.data.get('declared_value', 0))
    
    if not all([pickup_address, weight]):
        return Response(
            {'error': 'Missing required fields: pickup_address, weight'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get warehouse address from Warehouse model
        from logistics.models import Warehouse
        from logistics.services.pricing_calculator import PricingCalculator
        
        calculator = PricingCalculator()
        # Get warehouse based on shipping category (default to small_parcel)
        shipping_category = request.data.get('shipping_category', 'small_parcel')
        warehouse_address = calculator.get_warehouse_address(
            pickup_address.get('country', 'US'),
            shipping_category
        )
        
        if warehouse_address:
            warehouse_country = warehouse_address.get('country', 'US')
        else:
            warehouse_country = 'US'
        
        # Get EasyShip rates for domestic shipping
        easyship = EasyShipService()
        rates = easyship.get_rates(
            origin_country=pickup_address.get('country', 'US'),
            destination_country=warehouse_country,
            weight=weight,
            dimensions=dimensions,
            declared_value=declared_value
        )
        
        # Format rates for frontend
        formatted_rates = []
        for rate in rates:
            formatted_rates.append({
                'carrier': rate.get('courier', {}).get('name', 'Unknown'),
                'service_name': rate.get('service', {}).get('name', 'Standard'),
                'transport_mode_name': rate.get('service', {}).get('name', 'Standard'),
                'total': float(rate.get('total_charge', 0)),
                'base_rate': float(rate.get('shipment_charge', 0)),
                'currency': rate.get('currency', 'USD'),
                'transit_days': [
                    rate.get('estimated_delivery_days', 1),
                    rate.get('estimated_delivery_days', 3)
                ],
                'easyship_rate_id': rate.get('id'),
                'easyship_shipment_id': rate.get('easyship_shipment_id'),
            })
        
        return Response({
            'rates': formatted_rates,
            'warehouse_country': warehouse_country
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get warehouse rates: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_warehouse_label(request):
    """Create a prepaid shipping label to send items to warehouse via EasyShip"""
    
    pickup_address = request.data.get('pickup_address')
    package_details = request.data.get('package_details', {})
    carrier = request.data.get('carrier')
    rate_id = request.data.get('rate_id')  # EasyShip rate ID
    
    if not all([pickup_address, carrier, rate_id]):
        return Response(
            {'error': 'Missing required fields: pickup_address, carrier, rate_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get warehouse address from Warehouse model
        from logistics.models import Warehouse
        from logistics.services.pricing_calculator import PricingCalculator
        
        calculator = PricingCalculator()
        # Get warehouse based on shipping category (default to small_parcel)
        shipping_category = request.data.get('shipping_category', 'small_parcel')
        warehouse_address = calculator.get_warehouse_address(
            pickup_address.get('country', 'US'),
            shipping_category
        )
        
        if not warehouse_address:
            # Use default warehouse address
            warehouse_address_data = {
                'full_name': 'YuuSell Logistics Warehouse',
                'street_address': '123 Warehouse St',
                'city': 'Los Angeles',
                'state_province': 'CA',
                'postal_code': '90001',
                'country_alpha2': 'US',
                'phone': '+1-555-123-4567'
            }
        else:
            warehouse_address_data = {
                'full_name': warehouse_address.get('full_name', 'YuuSell Logistics Warehouse'),
                'street_address': warehouse_address.get('street_address', ''),
                'street_address_2': warehouse_address.get('street_address_2', ''),
                'city': warehouse_address.get('city', ''),
                'state_province': warehouse_address.get('state_province', ''),
                'postal_code': warehouse_address.get('postal_code', ''),
                'country_alpha2': warehouse_address.get('country', 'US'),
                'phone': warehouse_address.get('phone', '')
            }
        
        easyship = EasyShipService()
        
        # Prepare parcels
        parcels = [{
            'total_actual_weight': float(package_details.get('weight', 1)),
            'box': {
                'length': float(package_details.get('length', 10)),
                'width': float(package_details.get('width', 10)),
                'height': float(package_details.get('height', 10)),
            },
            'items': [{
                'description': package_details.get('description', 'Package to Warehouse'),
                'hs_code': '999999',
                'sku': 'WH',
                'quantity': 1,
                'value': float(package_details.get('declared_value', 0)),
                'currency': 'USD'
            }]
        }]
        
        # Format pickup address for EasyShip
        pickup_address_formatted = {
            'full_name': pickup_address.get('full_name', ''),
            'street_address': pickup_address.get('street_address', ''),
            'street_address_2': pickup_address.get('street_address_2', ''),
            'city': pickup_address.get('city', ''),
            'state_province': pickup_address.get('state_province', ''),
            'postal_code': pickup_address.get('postal_code', ''),
            'country_alpha2': pickup_address.get('country', 'US'),
            'phone': pickup_address.get('phone', '')
        }
        
        # Create shipment in EasyShip
        easyship_result = easyship.create_shipment(
            rate_id=rate_id,
            origin_address=pickup_address_formatted,
            destination_address=warehouse_address_data,
            parcels=parcels
        )
        
        if not easyship_result:
            return Response(
                {'error': 'Failed to create label in EasyShip'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'label_url': easyship_result.get('label_url'),
            'tracking_number': easyship_result.get('tracking_number'),
            'shipment_id': easyship_result.get('shipment_id'),
            'message': 'Warehouse label created successfully'
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to create warehouse label: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def track_shipment(request, shipment_id):
    """Track shipment status"""
    try:
        shipment = LogisticsShipment.objects.get(id=shipment_id, user=request.user)
        
        # Get tracking from EasyShip if available
        tracking_data = None
        if shipment.tracking_number and shipment.easyship_shipment_id:
            easyship = EasyShipService()
            tracking_data = easyship.get_tracking(shipment.tracking_number)
        
        serializer = LogisticsShipmentSerializer(shipment)
        return Response({
            'shipment': serializer.data,
            'tracking': tracking_data
        })
    except LogisticsShipment.DoesNotExist:
        return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def countries_list(request):
    """Get list of countries"""
    countries = Country.objects.all().order_by('name')
    serializer = CountrySerializer(countries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def transport_modes_list(request):
    """Get list of transport modes"""
    modes = TransportMode.objects.filter(is_active=True)
    serializer = TransportModeSerializer(modes, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def track_by_number(request, tracking_number):
    """Track shipment by tracking number, shipment number, or reference number (public access)"""
    from django.db.models import Q
    from .models import Package
    try:
        print("In tracking")
        # Try to find by tracking number
        shipment = LogisticsShipment.objects.filter(
            Q(tracking_number=tracking_number) |
            Q(shipment_number=tracking_number) |
            Q(local_carrier_tracking_number=tracking_number)
        ).select_related('transport_mode').first()
        print("Shipment", shipment)
        # If not found, try to find by package reference number
        if not shipment:
            package = Package.objects.filter(reference_number=tracking_number).first()
            print("Package", package)
            if package:
                # Get the latest shipment for this package
                shipment = package.shipments.first()
        
        
        if not shipment:
            print("No shipment")
            return Response(
                {'error': 'Tracking number not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        

        # Get tracking from EasyShip if available
        tracking_data = None
        if shipment.tracking_number and shipment.easyship_shipment_id:
            try:
                easyship = EasyShipService()
                tracking_data = easyship.get_tracking(shipment.tracking_number)
            except Exception as e:
                # If EasyShip fails, continue without tracking data
                pass
        
        serializer = LogisticsShipmentSerializer(shipment)
        
        # Get packages for this shipment
        packages = Package.objects.filter(shipment=shipment).select_related('user')
        package_serializer = PackageSerializer(packages, many=True)
        
        # Use tracking_updates from serializer (includes full data with raw_data)
        tracking_updates_data = serializer.data.get('tracking_updates', [])
        
        return Response({
            'shipment': serializer.data,
            'tracking': tracking_data,
            'tracking_updates': tracking_updates_data,  # Use serializer data which includes full tracking updates
            'packages': package_serializer.data
        })
    except Exception as e:
        return Response(
            {'error': 'An error occurred while tracking your package'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def available_transport_modes(request):
    """Get available transport modes for a country pair, optionally filtered by category"""
    origin_country = request.query_params.get('origin_country')
    destination_country = request.query_params.get('destination_country')
    shipping_category = request.query_params.get('shipping_category')  # Optional filter
    
    if not all([origin_country, destination_country]):
        return Response(
            {'error': 'Missing required parameters: origin_country, destination_country'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        origin_country_obj = Country.objects.get(code=origin_country)
        destination_country_obj = Country.objects.get(code=destination_country)
        
        # Get unique transport modes for this route
        # Use values() and distinct() instead of distinct('field') for SQLite compatibility
        transport_mode_ids = ShippingRoute.objects.filter(
            origin_country=origin_country_obj,
            destination_country=destination_country_obj,
            is_available=True
        ).values_list('transport_mode_id', flat=True).distinct()
        
        transport_modes = TransportMode.objects.filter(id__in=transport_mode_ids)
        
        # Filter by category if provided
        # Vehicles typically don't support air freight, only sea/road
        if shipping_category == 'vehicle':
            transport_modes = transport_modes.exclude(type='air')
        
        modes = []
        for mode in transport_modes:
            modes.append({
                'code': mode.code,
                'name': mode.name,
                'type': mode.type,
            })
        
        # If no modes available, indicate we don't deliver there
        if not modes:
            return Response({
                'origin_country': origin_country,
                'destination_country': destination_country,
                'available_modes': [],
                'message': 'We do not currently deliver to this destination. Please contact support for alternative options.',
                'delivery_available': False
            })
        
        return Response({
            'origin_country': origin_country,
            'destination_country': destination_country,
            'available_modes': modes,
            'delivery_available': True
        })
    except Country.DoesNotExist:
        return Response(
            {'error': 'Invalid country code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def easyship_webhook(request):
    """Handle EasyShip webhooks for various events"""
    import hmac
    import hashlib
    import json
    from django.conf import settings
    from datetime import datetime
    
    logger = logging.getLogger(__name__)
    
    # Verify webhook signature if secret is configured
    if settings.EASYSHIP_WEBHOOK_SECRET:
        signature = request.META.get('HTTP_X_EASYSHIP_SIGNATURE', '')
        payload = request.body
        
        expected_signature = hmac.new(
            settings.EASYSHIP_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    try:
        data = json.loads(request.body)
        event_type = data.get('event_type')
        webhook_data = data.get('data', {})
        
        # Get EasyShip shipment ID from various possible locations
        easyship_shipment_id = (
            webhook_data.get('easyship_shipment_id') or
            data.get('resource_id') or
            webhook_data.get('id')
        )
        
        if not easyship_shipment_id:
            logger.warning(f"EasyShip webhook received without shipment ID. Event: {event_type}, Data: {data}")
            return Response({'status': 'ignored', 'reason': 'no_shipment_id'})
        
        try:
            shipment = LogisticsShipment.objects.get(easyship_shipment_id=str(easyship_shipment_id))
        except LogisticsShipment.DoesNotExist:
            logger.warning(f"EasyShip webhook received for unknown shipment: {easyship_shipment_id}, Event: {event_type}")
            return Response({'status': 'ignored', 'reason': 'shipment_not_found'})
        
        # Handle different event types
        if event_type == 'shipment.label.created':
            # Label was successfully created
            label_url = webhook_data.get('label_url', '')
            tracking_number = webhook_data.get('tracking_number', '')
            tracking_page_url = webhook_data.get('tracking_page_url', '')
            
            # Update shipment with label info
            if label_url:
                shipment.easyship_label_url = label_url
            if tracking_number:
                shipment.tracking_number = tracking_number
                shipment.local_carrier_tracking_number = tracking_number
            if tracking_page_url:
                shipment.tracking_page_url = tracking_page_url
            
            # Change status from label_generating to processing
            if shipment.status == 'label_generating':
                shipment.status = 'processing'
            
            shipment.save()
            
            # Create tracking update
            TrackingUpdate.objects.create(
                shipment=shipment,
                carrier_tracking_number=tracking_number,
                status='label_created',
                location='',
                timestamp=timezone.now(),
                source='webhook',
                raw_data={
                    'event_type': event_type,
                    'label_url': label_url,
                    'tracking_number': tracking_number,
                    'status': 'success'
                }
            )
            
            logger.info(f"Label created for shipment {shipment.id}: {tracking_number}")
            
        elif event_type == 'shipment.label.failed':
            # Label generation failed
            shipment.status = 'payment_received'  # Revert to previous status
            shipment.save()
            
            # Create tracking update
            TrackingUpdate.objects.create(
                shipment=shipment,
                status='label_generation_failed',
                location='',
                timestamp=timezone.now(),
                source='webhook',
                raw_data={
                    'event_type': event_type,
                    'status': 'failed'
                }
            )
            
            logger.warning(f"Label generation failed for shipment {shipment.id}")
            
        elif event_type == 'shipment.tracking.status.changed':
            # Tracking status changed
            new_status = webhook_data.get('status', '')
            tracking_number = webhook_data.get('tracking_number', shipment.tracking_number)
            
            # Map EasyShip status to our status
            status_mapping = {
                'Label Created': 'processing',
                'Picked Up': 'dispatched',
                'In Transit': 'in_transit',
                'Out for Delivery': 'out_for_delivery',
                'Delivered': 'delivered',
                'Delivered': 'delivered',
            }
            
            # Update shipment status
            if new_status in status_mapping:
                shipment.status = status_mapping[new_status]
            
            # Update tracking number if provided
            if tracking_number:
                shipment.tracking_number = tracking_number
                shipment.local_carrier_tracking_number = tracking_number
            
            shipment.save()
            
            # Create tracking update
            TrackingUpdate.objects.create(
                shipment=shipment,
                carrier_tracking_number=tracking_number,
                status=new_status.lower().replace(' ', '_'),
                location=webhook_data.get('destination', ''),
                timestamp=timezone.now(),
                source='webhook',
                raw_data={
                    'event_type': event_type,
                    'status': new_status,
                    'tracking_number': tracking_number
                }
            )
            
            logger.info(f"Tracking status changed for shipment {shipment.id}: {new_status}")
            
        elif event_type == 'shipment.tracking.checkpoints.created':
            # New tracking checkpoints created
            checkpoints = webhook_data.get('checkpoints', [])
            tracking_number = webhook_data.get('tracking_number', shipment.tracking_number)
            
            # Update tracking number if provided
            if tracking_number:
                shipment.tracking_number = tracking_number
                shipment.local_carrier_tracking_number = tracking_number
            
            # Update shipment status based on latest checkpoint
            if checkpoints:
                latest_checkpoint = max(checkpoints, key=lambda x: x.get('order_number', 0))
                primary_status = latest_checkpoint.get('primary_status', '')
                
                # Map primary status to our status
                status_mapping = {
                    'Label Created': 'processing',
                    'Picked Up': 'dispatched',
                    'In Transit to Customer': 'in_transit',
                    'In Transit': 'in_transit',
                    'Out for Delivery': 'out_for_delivery',
                    'Delivered': 'delivered',
                }
                
                if primary_status in status_mapping:
                    shipment.status = status_mapping[primary_status]
            
            shipment.save()
            
            # Create tracking updates for each checkpoint
            for checkpoint in checkpoints:
                checkpoint_time = checkpoint.get('checkpoint_time')
                if checkpoint_time:
                    try:
                        # Parse ISO format timestamp
                        checkpoint_timestamp = datetime.fromisoformat(checkpoint_time.replace('Z', '+00:00'))
                    except:
                        checkpoint_timestamp = timezone.now()
                else:
                    checkpoint_timestamp = timezone.now()
                
                location_parts = []
                if checkpoint.get('city'):
                    location_parts.append(checkpoint.get('city'))
                if checkpoint.get('state'):
                    location_parts.append(checkpoint.get('state'))
                if checkpoint.get('postal_code'):
                    location_parts.append(checkpoint.get('postal_code'))
                if checkpoint.get('country_name'):
                    location_parts.append(checkpoint.get('country_name'))
                
                location = ', '.join(location_parts) if location_parts else checkpoint.get('location', '')
                
                TrackingUpdate.objects.create(
                    shipment=shipment,
                    carrier_tracking_number=tracking_number,
                    status=checkpoint.get('primary_status', '').lower().replace(' ', '_') or 'checkpoint',
                    location=location,
                    timestamp=checkpoint_timestamp,
                    source='webhook',
                    raw_data={
                        'event_type': event_type,
                        'checkpoint': checkpoint,
                        'message': checkpoint.get('message', ''),
                        'handler': checkpoint.get('handler', '')
                    }
                )
            
            logger.info(f"Created {len(checkpoints)} tracking checkpoints for shipment {shipment.id}")
            
        elif event_type == 'shipment.cancelled':
            # Shipment was cancelled
            shipment.status = 'cancelled'
            shipment.save()
            
            # Create tracking update
            TrackingUpdate.objects.create(
                shipment=shipment,
                status='cancelled',
                location='',
                timestamp=timezone.now(),
                source='webhook',
                raw_data={
                    'event_type': event_type,
                    'status': 'cancelled'
                }
            )
            
            logger.info(f"Shipment {shipment.id} was cancelled")
            
        else:
            logger.warning(f"Unhandled EasyShip webhook event type: {event_type}")
            return Response({'status': 'ignored', 'reason': 'unhandled_event_type'})
        
        return Response({'status': 'success', 'event_type': event_type})
        
    except json.JSONDecodeError:
        logger.error("EasyShip webhook: Invalid JSON")
        return Response(
            {'error': 'Invalid JSON'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"EasyShip webhook error: {str(e)}", exc_info=True)
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Pickup Management Endpoints for Workers

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pickup_requests(request):
    """List pickup requests for workers"""
    status_filter = request.query_params.get('status', None)
    worker_id = request.query_params.get('worker_id', None)
    
    queryset = PickupRequest.objects.select_related('shipment', 'worker').all()
    
    # Filter by status
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    # Filter by worker (if worker_id provided, otherwise show all)
    if worker_id:
        queryset = queryset.filter(worker_id=worker_id)
    elif request.user.is_staff:
        # Staff can see all, regular users see only assigned to them
        pass
    else:
        queryset = queryset.filter(worker=request.user)
    
    # Order by scheduled datetime or created date
    queryset = queryset.order_by('scheduled_datetime', '-created_at')
    
    pickup_requests = []
    for pickup in queryset:
        pickup_requests.append({
            'id': pickup.id,
            'shipment_number': pickup.shipment.shipment_number,
            'shipment_id': pickup.shipment.id,
            'status': pickup.status,
            'pickup_address': pickup.pickup_address,
            'contact_name': pickup.contact_name,
            'contact_phone': pickup.contact_phone,
            'special_instructions': pickup.special_instructions,
            'scheduled_date': pickup.scheduled_date.isoformat() if pickup.scheduled_date else None,
            'scheduled_time': pickup.scheduled_time.isoformat() if pickup.scheduled_time else None,
            'scheduled_datetime': pickup.scheduled_datetime.isoformat() if pickup.scheduled_datetime else None,
            'pickup_attempts': pickup.pickup_attempts,
            'last_attempt_date': pickup.last_attempt_date.isoformat() if pickup.last_attempt_date else None,
            'worker_id': pickup.worker.id if pickup.worker else None,
            'worker_name': pickup.worker.get_full_name() if pickup.worker else None,
            'expected_weight': float(pickup.expected_weight) if pickup.expected_weight else None,
            'expected_dimensions': pickup.expected_dimensions,
            'created_at': pickup.created_at.isoformat(),
        })
    
    return Response({
        'pickup_requests': pickup_requests,
        'count': len(pickup_requests)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pickup_request(request, pickup_id):
    """Get details of a specific pickup request"""
    try:
        pickup = PickupRequest.objects.select_related('shipment', 'worker').get(id=pickup_id)
        
        # Check permissions - user can see their own shipment's pickup, worker can see assigned, staff can see all
        if not request.user.is_staff:
            if pickup.worker and pickup.worker != request.user:
                # Check if user owns the shipment
                if pickup.shipment.user != request.user:
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif pickup.shipment.user != request.user:
                # Not a worker and doesn't own the shipment
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return Response({
            'id': pickup.id,
            'shipment_number': pickup.shipment.shipment_number,
            'shipment_id': pickup.shipment.id,
            'status': pickup.status,
            'pickup_address': pickup.pickup_address,
            'contact_name': pickup.contact_name,
            'contact_phone': pickup.contact_phone,
            'special_instructions': pickup.special_instructions,
            'scheduled_date': pickup.scheduled_date.isoformat() if pickup.scheduled_date else None,
            'scheduled_time': pickup.scheduled_time.isoformat() if pickup.scheduled_time else None,
            'scheduled_datetime': pickup.scheduled_datetime.isoformat() if pickup.scheduled_datetime else None,
            'pickup_attempts': pickup.pickup_attempts,
            'last_attempt_date': pickup.last_attempt_date.isoformat() if pickup.last_attempt_date else None,
            'completed_at': pickup.completed_at.isoformat() if pickup.completed_at else None,
            'picked_up_at': pickup.picked_up_at.isoformat() if pickup.picked_up_at else None,
            'delivered_to_warehouse_at': pickup.delivered_to_warehouse_at.isoformat() if pickup.delivered_to_warehouse_at else None,
            'failure_reason': pickup.failure_reason,
            'notes': pickup.notes,
            'worker_id': pickup.worker.id if pickup.worker else None,
            'worker_name': pickup.worker.get_full_name() if pickup.worker else None,
            'expected_weight': float(pickup.expected_weight) if pickup.expected_weight else None,
            'expected_dimensions': pickup.expected_dimensions,
            'actual_weight': float(pickup.actual_weight) if pickup.actual_weight else None,
            'actual_dimensions': pickup.actual_dimensions,
            'created_at': pickup.created_at.isoformat(),
            'updated_at': pickup.updated_at.isoformat(),
        })
    except PickupRequest.DoesNotExist:
        return Response(
            {'error': 'Pickup request not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated users to validate addresses
def validate_address(request):
    """
    Validate address using EasyShip API
    POST /api/v1/logistics/validate-address/
    
    Body:
    {
        "address": {
            "company_name": "Optional",
            "line_1": "Street address",
            "city": "City",
            "postal_code": "ZIP code",
            "country_alpha2": "US",
            "state": "State (optional)",
            "line_2": "Apt/Suite (optional)"
        },
        "replace_with_validation_result": true
    }
    """
    logger = logging.getLogger(__name__)
    try:
        address_data = request.data.get('address', {})
        replace_with_validation_result = request.data.get('replace_with_validation_result', True)
        
        if not address_data:
            return Response(
                {'error': 'Address data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate required fields - convert our format to EasyShip format
        line_1 = address_data.get('line_1') or address_data.get('street_address', '')
        city = address_data.get('city', '')
        postal_code = address_data.get('postal_code', '')
        country_alpha2 = address_data.get('country_alpha2') or address_data.get('country', '')
        
        if not line_1 or not city or not postal_code or not country_alpha2:
            return Response(
                {'error': 'Missing required fields: street_address (line_1), city, postal_code, country_alpha2'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert our address format to EasyShip format
        easyship_address = {
            'line_1': line_1,
            'city': city,
            'postal_code': postal_code,
            'country_alpha2': country_alpha2,
        }
        
        # Add optional fields
        if address_data.get('company_name') or address_data.get('company'):
            easyship_address['company_name'] = (address_data.get('company_name') or address_data.get('company', '')).strip()
        
        if address_data.get('state') or address_data.get('state_province'):
            easyship_address['state'] = (address_data.get('state') or address_data.get('state_province', '')).strip()
        
        if address_data.get('line_2') or address_data.get('street_address_2'):
            easyship_address['line_2'] = (address_data.get('line_2') or address_data.get('street_address_2', '')).strip()
        
        # Call EasyShip validation
        easyship = EasyShipService()
        result = easyship.validate_address(easyship_address, replace_with_validation_result)
        
        if result is None:
            return Response(
                {'error': 'Address validation failed. Please check your address and try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Check if validation was successful
        if 'error' in result:
            return Response(
                {'error': result.get('error', 'Address validation failed')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return validated address
        validated_address = result.get('address', {}) if replace_with_validation_result else easyship_address
        
        # Convert EasyShip format back to our format
        formatted_address = {
            'company_name': validated_address.get('company_name', address_data.get('company_name', '')),
            'street_address': validated_address.get('line_1', line_1),
            'street_address_2': validated_address.get('line_2', address_data.get('street_address_2', '')),
            'city': validated_address.get('city', city),
            'state_province': validated_address.get('state', address_data.get('state_province', '')),
            'postal_code': validated_address.get('postal_code', postal_code),
            'country': validated_address.get('country_alpha2', country_alpha2),
            'country_alpha2': validated_address.get('country_alpha2', country_alpha2),
        }
        
        return Response({
            'success': True,
            'validated': True,
            'original_address': address_data,
            'validated_address': formatted_address,
            'validation_result': result
        })
        
    except Exception as e:
        logger.error(f"Error validating address: {str(e)}")
        return Response(
            {'error': 'An error occurred while validating the address'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_pickup(request, pickup_id):
    """Schedule pickup date and time (user can request, worker can assign)"""
    scheduled_date = request.data.get('scheduled_date')
    scheduled_time = request.data.get('scheduled_time')
    special_instructions = request.data.get('special_instructions', '')
    worker_id = request.data.get('worker_id')  # Optional, only for workers/staff
    
    if not scheduled_date or not scheduled_time:
        return Response(
            {'error': 'Missing required fields: scheduled_date, scheduled_time'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        pickup = PickupRequest.objects.select_related('shipment').get(id=pickup_id)
        
        # Check if shipment is paid before allowing pickup scheduling
        if not is_shipment_paid(pickup.shipment):
            return Response(
                {'error': 'Payment is required before scheduling a pickup. Please complete payment for your quote first.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Permission check - user can schedule their own shipment's pickup, worker/staff can schedule any
        if not request.user.is_staff:
            if pickup.worker and pickup.worker != request.user:
                # Check if user owns the shipment
                if pickup.shipment.user != request.user:
                    return Response(
                        {'error': 'Permission denied. Only shipment owner, assigned worker, or staff can schedule pickups.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif pickup.shipment.user != request.user:
                # Not a worker and doesn't own the shipment
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Assign worker
        worker = None
        if worker_id:
            from accounts.models import User
            try:
                worker = User.objects.get(id=worker_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Worker not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            worker = request.user
        
        # Parse date and time
        
        scheduled_date_obj = datetime.strptime(scheduled_date, '%Y-%m-%d').date()
        
        # Handle both H:M and H:M:S time formats
        try:
            scheduled_time_obj = datetime.strptime(scheduled_time, '%H:%M:%S').time()
        except ValueError:
            try:
                scheduled_time_obj = datetime.strptime(scheduled_time, '%H:%M').time()
            except ValueError:
                return Response(
                    {'error': 'Invalid time format. Please use HH:MM or HH:MM:SS format.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate that scheduled datetime is not in the past
        scheduled_datetime_combined = datetime.combine(scheduled_date_obj, scheduled_time_obj)
        # Make timezone-aware if needed
        if timezone.is_aware(timezone.now()):
            scheduled_datetime_combined = timezone.make_aware(scheduled_datetime_combined)
        
        if scheduled_datetime_combined < timezone.now():
            return Response(
                {'error': 'Cannot schedule pickup in the past. Please select a future date and time.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pickup.scheduled_date = scheduled_date_obj
        pickup.scheduled_time = scheduled_time_obj
        if special_instructions:
            pickup.special_instructions = special_instructions
        # Only assign worker if provided (by staff/worker), otherwise leave as pending assignment
        if worker:
            pickup.worker = worker
            pickup.status = 'scheduled'
        else:
            # User requested pickup, mark as pending assignment
            pickup.status = 'pending'
        pickup.save()
        
        return Response({
            'message': 'Pickup scheduled successfully',
            'pickup': {
                'id': pickup.id,
                'scheduled_date': pickup.scheduled_date.isoformat(),
                'scheduled_time': pickup.scheduled_time.isoformat(),
                'scheduled_datetime': pickup.scheduled_datetime.isoformat() if pickup.scheduled_datetime else None,
                'worker_id': pickup.worker.id,
                'worker_name': pickup.worker.get_full_name(),
                'status': pickup.status,
            }
        })
    except PickupRequest.DoesNotExist:
        return Response(
            {'error': 'Pickup request not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as e:
        return Response(
            {'error': f'Invalid date/time format: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_pickup_status(request, pickup_id):
    """Update pickup status (in_progress, completed, failed)"""
    new_status = request.data.get('status')
    notes = request.data.get('notes', '')
    failure_reason = request.data.get('failure_reason', '')
    actual_weight = request.data.get('actual_weight')
    actual_dimensions = request.data.get('actual_dimensions', {})
    
    if not new_status:
        return Response(
            {'error': 'Missing required field: status'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    valid_statuses = ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled']
    if new_status not in valid_statuses:
        return Response(
            {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        pickup = PickupRequest.objects.select_related('shipment').get(id=pickup_id)
        
        # Permission check - user can cancel their own shipment's pickup, worker/staff can update status
        if not request.user.is_staff:
            if new_status == 'cancelled' and pickup.shipment.user == request.user:
                # User can cancel their own pickup
                pass
            elif pickup.worker != request.user:
                return Response(
                    {'error': 'Permission denied. Only shipment owner, assigned worker, or staff can update pickup status.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        old_status = pickup.status
        pickup.status = new_status
        pickup.notes = notes
        
        # Update timestamps based on status
        if new_status == 'in_progress':
            pickup.pickup_attempts += 1
            pickup.last_attempt_date = timezone.now()
        elif new_status == 'completed':
            pickup.completed_at = timezone.now()
            pickup.picked_up_at = timezone.now()
            if actual_weight:
                pickup.actual_weight = Decimal(str(actual_weight))
            if actual_dimensions:
                pickup.actual_dimensions = actual_dimensions
            
            # Update shipment tracking
            TrackingUpdate.objects.create(
                shipment=pickup.shipment,
                carrier_tracking_number=pickup.shipment.local_carrier_tracking_number or '',
                status='picked_up',
                location=pickup.pickup_address.get('city', ''),
                timestamp=timezone.now(),
                source='manual',
                raw_data={'pickup_request_id': pickup.id}
            )
            
            # Update shipment status if needed
            if pickup.shipment.status == 'payment_received':
                pickup.shipment.status = 'processing'
                pickup.shipment.save()
        elif new_status == 'failed':
            pickup.pickup_attempts += 1
            pickup.last_attempt_date = timezone.now()
            pickup.failure_reason = failure_reason
            
            # Create tracking update for failed pickup
            TrackingUpdate.objects.create(
                shipment=pickup.shipment,
                status='pickup_failed',
                location=pickup.pickup_address.get('city', ''),
                timestamp=timezone.now(),
                source='manual',
                raw_data={'pickup_request_id': pickup.id, 'failure_reason': failure_reason}
            )
        
        pickup.save()
        
        return Response({
            'message': f'Pickup status updated from {old_status} to {new_status}',
            'pickup': {
                'id': pickup.id,
                'status': pickup.status,
                'pickup_attempts': pickup.pickup_attempts,
                'last_attempt_date': pickup.last_attempt_date.isoformat() if pickup.last_attempt_date else None,
            }
        })
    except PickupRequest.DoesNotExist:
        return Response(
            {'error': 'Pickup request not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_pickup_delivered_to_warehouse(request, pickup_id):
    """Mark pickup as delivered to warehouse and update tracking"""
    try:
        pickup = PickupRequest.objects.select_related('shipment').get(id=pickup_id)
        
        # Check permissions
        if not request.user.is_staff and pickup.worker != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if pickup.status != 'completed':
            return Response(
                {'error': 'Pickup must be completed before marking as delivered to warehouse'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pickup.delivered_to_warehouse_at = timezone.now()
        pickup.save()
        
        # Update shipment tracking
        TrackingUpdate.objects.create(
            shipment=pickup.shipment,
            carrier_tracking_number=pickup.shipment.local_carrier_tracking_number or '',
            status='warehouse_received',
            location='Warehouse',
            timestamp=timezone.now(),
            source='manual',
            raw_data={'pickup_request_id': pickup.id}
        )
        
        # Update shipment status
        if pickup.shipment.status in ['processing', 'dispatched']:
            pickup.shipment.status = 'in_transit'
            pickup.shipment.save()
        
        return Response({
            'message': 'Pickup marked as delivered to warehouse',
            'pickup': {
                'id': pickup.id,
                'delivered_to_warehouse_at': pickup.delivered_to_warehouse_at.isoformat(),
            },
            'shipment': {
                'id': pickup.shipment.id,
                'status': pickup.shipment.status,
            }
        })
    except PickupRequest.DoesNotExist:
        return Response(
            {'error': 'Pickup request not found'},
            status=status.HTTP_404_NOT_FOUND
        )

