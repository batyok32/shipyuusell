from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import WarehouseLabel, PickupSchedule, WarehouseReceiving
from logistics.models import Package
from logistics.services.easyship_service import EasyShipService
from buying.models import BuyingRequest
from buying.services.email_service import send_delivery_photos_user_email
from django.conf import settings
from django.utils import timezone
import uuid


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def warehouse_address(request):
    """Get user's unique warehouse receiving address"""
    user = request.user
    warehouse_address = {
        'full_name': f"{user.warehouse_id} - {user.get_full_name() or user.email}",
        'company': 'YuuSell Logistics Warehouse',
        'street_address': '1234 Warehouse Blvd',  # Replace with actual address
        'city': 'Los Angeles',
        'state_province': 'CA',
        'postal_code': '90001',
        'country': 'US',
        'warehouse_id': user.warehouse_id,
        'instructions': f'Include your warehouse ID ({user.warehouse_id}) on the package label'
    }
    return Response(warehouse_address)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_warehouse_label(request):
    """Create prepaid shipping label to warehouse"""
    weight = float(request.data.get('weight', 0))
    dimensions = request.data.get('dimensions', {})
    pickup_address = request.data.get('pickup_address', {})
    carrier = request.data.get('carrier')
    service = request.data.get('service')
    rate_id = request.data.get('rate_id')
    
    if not all([weight, dimensions, pickup_address, rate_id]):
        return Response(
            {'error': 'Missing required fields'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get warehouse address
    user = request.user
    warehouse_addr = {
        'full_name': f"{user.warehouse_id} - {user.get_full_name() or user.email}",
        'company': 'YuuSell Logistics Warehouse',
        'street_address': '1234 Warehouse Blvd',
        'city': 'Los Angeles',
        'state_province': 'CA',
        'postal_code': '90001',
        'country': 'US',
        'phone': '+1234567890'
    }
    
    # Create label via EasyShip
    easyship = EasyShipService()
    
    # Format addresses for EasyShip
    origin_addr = {
        'name': pickup_address.get('full_name', ''),
        'company': pickup_address.get('company', ''),
        'line1': pickup_address.get('street_address', ''),
        'line2': pickup_address.get('street_address_2', ''),
        'city': pickup_address.get('city', ''),
        'state': pickup_address.get('state_province', ''),
        'postal_code': pickup_address.get('postal_code', ''),
        'country_alpha2': pickup_address.get('country', 'US'),
        'phone': pickup_address.get('phone', '')
    }
    
    dest_addr = {
        'name': warehouse_addr['full_name'],
        'company': warehouse_addr['company'],
        'line1': warehouse_addr['street_address'],
        'city': warehouse_addr['city'],
        'state': warehouse_addr['state_province'],
        'postal_code': warehouse_addr['postal_code'],
        'country_alpha2': warehouse_addr['country'],
        'phone': warehouse_addr['phone']
    }
    
    parcels = [{
        'total_actual_weight': weight,
        'box': {
            'length': dimensions.get('length', 10),
            'width': dimensions.get('width', 10),
            'height': dimensions.get('height', 10),
        }
    }]
    
    result = easyship.create_shipment(rate_id, origin_addr, dest_addr, parcels)
    
    if not result:
        return Response(
            {'error': 'Failed to create label'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create warehouse label record
    label = WarehouseLabel.objects.create(
        user=user,
        label_number=f"WH-{uuid.uuid4().hex[:8].upper()}",
        carrier=carrier,
        service_name=service,
        tracking_number=result.get('tracking_number', ''),
        label_url=result.get('label_url', ''),
        cost=0,  # Will be set from payment
        weight=weight,
        dimensions=dimensions,
        pickup_address=pickup_address,
        warehouse_address=warehouse_addr,
        easyship_label_id=result.get('shipment_id', ''),
        status='generated'
    )
    
    return Response({
        'label_id': label.id,
        'label_number': label.label_number,
        'label_url': label.label_url,
        'tracking_number': label.tracking_number,
        'cost': float(label.cost)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def warehouse_labels_list(request):
    """List user's warehouse labels"""
    labels = WarehouseLabel.objects.filter(user=request.user).order_by('-created_at')
    return Response([{
        'id': label.id,
        'label_number': label.label_number,
        'carrier': label.carrier,
        'tracking_number': label.tracking_number,
        'status': label.status,
        'cost': float(label.cost),
        'created_at': label.created_at
    } for label in labels])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_pickup(request):
    """Schedule a pickup for warehouse inbound shipping"""
    pickup_address = request.data.get('pickup_address', {})
    pickup_date = request.data.get('pickup_date')
    pickup_time_slot = request.data.get('pickup_time_slot', '09:00-12:00')
    weight = float(request.data.get('weight', 0))
    dimensions = request.data.get('dimensions', {})
    number_of_packages = int(request.data.get('number_of_packages', 1))
    contact_name = request.data.get('contact_name', '')
    contact_phone = request.data.get('contact_phone', '')
    special_instructions = request.data.get('special_instructions', '')
    
    if not all([pickup_address, pickup_date, weight, contact_name, contact_phone]):
        return Response(
            {'error': 'Missing required fields: pickup_address, pickup_date, weight, contact_name, contact_phone'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = request.user
    
    # Create pickup schedule
    pickup = PickupSchedule.objects.create(
        user=user,
        pickup_number=f"PICKUP-{uuid.uuid4().hex[:8].upper()}",
        pickup_address=pickup_address,
        pickup_date=pickup_date,
        pickup_time_slot=pickup_time_slot,
        weight=weight,
        dimensions=dimensions,
        number_of_packages=number_of_packages,
        contact_name=contact_name,
        contact_phone=contact_phone,
        special_instructions=special_instructions,
        status='pending'
    )
    
    # TODO: Integrate with EasyShip or carrier API for actual pickup scheduling
    # For now, just create the record
    
    return Response({
        'pickup_id': pickup.id,
        'pickup_number': pickup.pickup_number,
        'pickup_date': pickup.pickup_date,
        'pickup_time_slot': pickup.pickup_time_slot,
        'status': pickup.status
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pickup_schedules_list(request):
    """List user's pickup schedules"""
    pickups = PickupSchedule.objects.filter(user=request.user).order_by('-created_at')
    return Response([{
        'id': pickup.id,
        'pickup_number': pickup.pickup_number,
        'pickup_date': pickup.pickup_date,
        'pickup_time_slot': pickup.pickup_time_slot,
        'status': pickup.status,
        'contact_name': pickup.contact_name,
        'contact_phone': pickup.contact_phone,
        'created_at': pickup.created_at
    } for pickup in pickups])


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def receive_package(request):
    """Warehouse worker receives package by reference number"""
    reference_number = request.data.get('reference_number')
    weight = request.data.get('weight')
    dimensions = request.data.get('dimensions', {})
    tracking_number = request.data.get('tracking_number', '')
    storage_location = request.data.get('storage_location', '')
    photos = request.data.get('photos', [])
    description = request.data.get('description', '')
    
    if not reference_number:
        return Response(
            {'error': 'Reference number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Find buying request by reference number
    try:
        buying_request = BuyingRequest.objects.get(reference_number=reference_number)
    except BuyingRequest.DoesNotExist:
        return Response(
            {'error': 'Buying request not found with this reference number'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get or create package (should already exist from payment, but create if not)
    try:
        package = Package.objects.get(reference_number=reference_number)
        # Update existing package
        if weight:
            package.weight = weight
        if dimensions:
            package.length = dimensions.get('length')
            package.width = dimensions.get('width')
            package.height = dimensions.get('height')
        if tracking_number:
            package.tracking_number = tracking_number
        if storage_location:
            package.storage_location = storage_location
        if description:
            package.description = description
        if photos:
            # Store URLs in legacy photos field (for backward compatibility)
            package.photos = photos
        package.received_date = timezone.now()
        package.status = 'received'
        package.save()
    except Package.DoesNotExist:
        # Create new package if it doesn't exist (shouldn't happen in buy-and-ship flow)
        package = Package.objects.create(
            reference_number=reference_number,
            user=buying_request.user,
            tracking_number=tracking_number,
            weight=weight,
            length=dimensions.get('length'),
            width=dimensions.get('width'),
            height=dimensions.get('height'),
            photos=photos,
            received_date=timezone.now(),
            storage_location=storage_location,
            description=description,
            status='received',
            declared_value=buying_request.approximate_quote_data.get('declared_value', 0) if buying_request.approximate_quote_data else 0,
        )
        
        # Link to shipment if buying request has one
        if buying_request.shipment:
            package.shipment = buying_request.shipment
            buying_request.shipment.packages.add(package)
            package.save()
    
    # Link package to buying request
    buying_request.package = package
    buying_request.status = 'received_at_warehouse'
    buying_request.save()
    
    # Create warehouse receiving record
    receiving, _ = WarehouseReceiving.objects.get_or_create(
        package=package,
        defaults={
            'received_by': request.user,
            'storage_location': storage_location,
            'inspection_notes': description,
        }
    )
    
    # If there's a shipment linked to this buying request and it's paid, update it with actual dimensions
    # and generate label if possible
    if buying_request.shipment and buying_request.shipment.status == 'payment_received':
        from logistics.models import LogisticsShipment
        from logistics.services.easyship_service import EasyShipService
        from logistics.services.pricing_calculator import PricingCalculator
        from decimal import Decimal
        
        shipment = buying_request.shipment
        
        # Update shipment with actual weight and dimensions
        if weight:
            shipment.actual_weight = Decimal(str(weight))
            # Recalculate chargeable weight
            calculator = PricingCalculator()
            dim_weight = calculator.calculate_dimensional_weight(
                dimensions.get('length', 10),
                dimensions.get('width', 10),
                dimensions.get('height', 10),
                5000
            )
            shipment.chargeable_weight = max(Decimal(str(weight)), dim_weight)
        
        # Update dimensions in origin_address
        origin_address = shipment.origin_address.copy()
        origin_address['dimensions'] = dimensions
        shipment.origin_address = origin_address
        
        # Update volume
        if dimensions.get('length') and dimensions.get('width') and dimensions.get('height'):
            length_m = Decimal(str(dimensions.get('length', 10))) / Decimal('100')
            width_m = Decimal(str(dimensions.get('width', 10))) / Decimal('100')
            height_m = Decimal(str(dimensions.get('height', 10))) / Decimal('100')
            shipment.actual_volume = length_m * width_m * height_m
        
        shipment.status = 'ready_to_ship'
        shipment.save()
        
        # Link package to shipment
        shipment.packages.add(package)
        
        # Try to generate label if easyship_rate_id is available
        easyship_rate_id = origin_address.get('easyship_rate_id')
        if easyship_rate_id:
            try:
                easyship = EasyShipService()
                
                # Prepare parcels
                parcels = [{
                    'total_actual_weight': float(shipment.actual_weight),
                    'box': {
                        'length': float(dimensions.get('length', 10)),
                        'width': float(dimensions.get('width', 10)),
                        'height': float(dimensions.get('height', 10)),
                    },
                    'items': [{
                        'description': origin_address.get('description', buying_request.product_name or 'General Merchandise'),
                        'hs_code': '999999',
                        'sku': 'BS',
                        'quantity': 1,
                        'declared_customs_value': float(origin_address.get('declared_value', buying_request.approximate_quote_data.get('declared_value', 0) if buying_request.approximate_quote_data else 0)),
                        'declared_currency': 'USD',
                    }]
                }]
                
                # Get warehouse address (origin)
                warehouse_address = calculator.get_warehouse_address('US', shipment.shipping_category)
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
                
                # Create shipment in EasyShip (warehouse to destination)
                easyship_result = easyship.create_shipment(
                    rate_id=easyship_rate_id,
                    origin_address=warehouse_address,
                    destination_address=shipment.destination_address,
                    parcels=parcels
                )
                
                if easyship_result:
                    shipment.easyship_shipment_id = easyship_result.get('shipment_id', '')
                    shipment.tracking_number = easyship_result.get('tracking_number', '')
                    shipment.local_carrier_tracking_number = easyship_result.get('tracking_number', '')
                    shipment.easyship_label_url = easyship_result.get('label_url', '')
                    shipment.status = 'processing'
                    shipment.save()
                    
                    # Update buying request status
                    buying_request.status = 'ready_to_ship'
                    buying_request.save()
            except Exception as e:
                # Log error but don't fail the package receiving
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error generating label for buy-and-ship shipment: {str(e)}")
    
    return Response({
        'package_id': package.id,
        'reference_number': package.reference_number,
        'buying_request_id': buying_request.id,
        'status': package.status,
        'message': 'Package received successfully',
        'shipment_created': buying_request.shipment is not None,
        'shipment_id': buying_request.shipment.id if buying_request.shipment else None,
    })

