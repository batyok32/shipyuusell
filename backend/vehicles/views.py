from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
import stripe
from .models import Vehicle, VehicleDocument
from .serializers import VehicleSerializer
from .services.email_service import send_inspection_report_email, send_condition_report_signed_email
from logistics.models import LogisticsShipment, TransportMode, TrackingUpdate
from logistics.services.pricing_calculator import PricingCalculator
from payments.models import Payment
import uuid


class VehicleViewSet(viewsets.ModelViewSet):
    """Vehicle shipping management"""
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Vehicle.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_vehicle_pricing(request):
    """Calculate RoRo vs Container pricing for vehicle"""
    origin_country = request.data.get('origin_country', 'US')
    destination_country = request.data.get('destination_country')
    vehicle_type = request.data.get('vehicle_type')
    length = float(request.data.get('length', 0))
    width = float(request.data.get('width', 0))
    height = float(request.data.get('height', 0))
    weight = float(request.data.get('weight', 0))
    condition = request.data.get('condition', 'running')
    
    if not all([destination_country, vehicle_type, length, width, height, weight]):
        return Response(
            {'error': 'Missing required fields'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate base pricing
    # RoRo pricing: $1200-3500 based on size and route
    base_roro = 1200
    size_factor = (length * width * height) / 1000000  # CBM
    route_factor = 1.5 if destination_country not in ['US', 'CA', 'MX'] else 1.0
    
    roro_price = base_roro + (size_factor * 200) * route_factor
    if condition == 'non_running':
        roro_price += 500  # Winch loading fee
    
    # Container pricing: $3000-8000
    base_container_20ft = 3000
    base_container_40ft = 5000
    base_container_shared = 2500
    
    container_20ft_price = base_container_20ft + (size_factor * 300) * route_factor
    container_40ft_price = base_container_40ft + (size_factor * 400) * route_factor
    container_shared_price = base_container_shared + (size_factor * 200) * route_factor
    
    # Transit times
    roro_transit = [10, 60]  # days
    container_transit = [15, 50]  # days
    
    return Response({
        'roro': {
            'price': round(roro_price, 2),
            'transit_days': roro_transit,
            'description': 'Vehicle driven onto cargo ship. Must be operational, ¼ tank fuel max.',
            'requirements': ['Operational', '¼ tank fuel max', 'Valid registration', 'Insurance'],
            'extra_fees': 500 if condition == 'non_running' else 0
        },
        'container_20ft': {
            'price': round(container_20ft_price, 2),
            'transit_days': container_transit,
            'description': '20ft exclusive container. Better protection, can include personal items.',
            'requirements': ['Valid registration', 'Insurance', 'Export documentation'],
            'extra_fees': 0
        },
        'container_40ft': {
            'price': round(container_40ft_price, 2),
            'transit_days': container_transit,
            'description': '40ft exclusive container. Maximum protection, can include personal items.',
            'requirements': ['Valid registration', 'Insurance', 'Export documentation'],
            'extra_fees': 0
        },
        'container_shared': {
            'price': round(container_shared_price, 2),
            'transit_days': container_transit,
            'description': 'Shared container. Most economical option for smaller vehicles.',
            'requirements': ['Valid registration', 'Insurance', 'Export documentation'],
            'extra_fees': 0
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_documents_to_sign(request):
    """Get documents that need to be signed before payment"""
    documents = VehicleDocument.objects.filter(is_active=True, is_required=True)
    docs_data = []
    for doc in documents:
        docs_data.append({
            'id': doc.id,
            'name': doc.name,
            'document_type': doc.document_type,
            'document_type_display': doc.get_document_type_display(),
            'file_url': doc.file.url if doc.file else None,
            'description': doc.description,
            'is_required': doc.is_required,
        })
    return Response({'documents': docs_data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_documents(request):
    """Sign documents before payment (stores signature data)"""
    documents_signed = request.data.get('documents_signed', {})
    # Format: {document_id: {signed_at: timestamp, signature_data: {...}}}
    
    if not documents_signed:
        return Response(
            {'error': 'No documents provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate all required documents are signed
    required_docs = VehicleDocument.objects.filter(is_active=True, is_required=True)
    signed_doc_ids = [int(doc_id) for doc_id in documents_signed.keys()]
    required_doc_ids = [doc.id for doc in required_docs]
    
    missing_docs = set(required_doc_ids) - set(signed_doc_ids)
    if missing_docs:
        missing_names = [VehicleDocument.objects.get(id=doc_id).name for doc_id in missing_docs]
        return Response(
            {'error': f'Missing required documents: {", ".join(missing_names)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Store signed documents (this will be saved to Vehicle when created)
    return Response({
        'documents_signed': documents_signed,
        'message': 'Documents signed successfully. You can now proceed to payment.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_vehicle_request(request):
    """Create vehicle shipping request (after documents are signed)"""
    make = request.data.get('make')
    model = request.data.get('model')
    year = int(request.data.get('year', 0))
    vin = request.data.get('vin', '')
    vehicle_type = request.data.get('vehicle_type')
    shipping_method = request.data.get('shipping_method')
    condition = request.data.get('condition')
    length = Decimal(str(request.data.get('length', 0)))
    width = Decimal(str(request.data.get('width', 0)))
    height = Decimal(str(request.data.get('height', 0)))
    weight = Decimal(str(request.data.get('weight', 0)))
    quote_amount = Decimal(str(request.data.get('quote_amount', 0)))
    pickup_cost = Decimal(str(request.data.get('pickup_cost', 0)))
    origin_address = request.data.get('origin_address', {})
    destination_address = request.data.get('destination_address', {})
    documents_signed = request.data.get('documents_signed', {})
    
    if not all([make, model, year, vehicle_type, shipping_method, condition, origin_address, destination_address]):
        return Response(
            {'error': 'Missing required fields'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate documents are signed
    required_docs = VehicleDocument.objects.filter(is_active=True, is_required=True)
    if documents_signed:
        signed_doc_ids = [int(doc_id) for doc_id in documents_signed.keys()]
        required_doc_ids = [doc.id for doc in required_docs]
        missing_docs = set(required_doc_ids) - set(signed_doc_ids)
        if missing_docs:
            return Response(
                {'error': 'All required documents must be signed before creating request'},
                status=status.HTTP_400_BAD_REQUEST
            )
    elif required_docs.exists():
        return Response(
            {'error': 'Documents must be signed before creating request'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    total_amount = quote_amount + pickup_cost
    
    vehicle = Vehicle.objects.create(
        user=request.user,
        make=make,
        model=model,
        year=year,
        vin=vin,
        vehicle_type=vehicle_type,
        shipping_method=shipping_method,
        condition=condition,
        length=length,
        width=width,
        height=height,
        weight=weight,
        quote_amount=quote_amount,
        pickup_cost=pickup_cost,
        total_amount=total_amount,
        origin_address=origin_address,
        destination_address=destination_address,
        documents_signed=documents_signed,
        documents_signed_at=timezone.now() if documents_signed else None,
        status='documents_signed' if documents_signed else 'pending_documents',
        payment_paid=False
    )
    
    serializer = VehicleSerializer(vehicle)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_inspection(request, vehicle_id):
    """Submit vehicle inspection report (by pickup guy/admin)"""
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is admin or pickup guy (or vehicle owner for self-inspection)
    if not (request.user.is_staff or vehicle.user == request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    inspection_report = request.data.get('inspection_report', {})
    
    # Handle photo uploads
    for i in range(1, 21):
        photo_field = f'inspection_photo_{i}'
        if photo_field in request.FILES:
            setattr(vehicle, photo_field, request.FILES[photo_field])
    
    vehicle.inspection_report = inspection_report
    vehicle.inspection_completed_at = timezone.now()
    vehicle.inspected_by = request.user
    vehicle.status = 'inspection_completed'
    vehicle.save()
    
    # Send email to user with inspection report
    try:
        send_inspection_report_email(vehicle)
    except Exception as e:
        # Log error but don't fail the inspection submission
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending inspection report email: {str(e)}")
    
    serializer = VehicleSerializer(vehicle)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_condition_report(request, vehicle_id):
    """Sign condition report digitally (by user)"""
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id, user=request.user)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)
    
    signature_data = request.data.get('signature_data', {})
    
    vehicle.condition_report_signed = True
    vehicle.condition_report_signed_at = timezone.now()
    vehicle.condition_report_signature = signature_data
    vehicle.status = 'condition_report_signed'
    vehicle.save()
    
    # Send confirmation email
    try:
        send_condition_report_signed_email(vehicle)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending condition report signed email: {str(e)}")
    
    serializer = VehicleSerializer(vehicle)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request, vehicle_id):
    """Create Stripe checkout session for vehicle payment (full payment, no deposit)"""
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id, user=request.user)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if documents are signed
    if vehicle.status != 'documents_signed':
        return Response(
            {'error': 'Documents must be signed before payment'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if vehicle.payment_paid:
        return Response(
            {'error': 'Payment already completed'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Vehicle Shipping: {vehicle.year} {vehicle.make} {vehicle.model}',
                        'description': f'Vehicle shipping from {vehicle.origin_address.get("city", "Origin")} to {vehicle.destination_address.get("city", "Destination")}',
                    },
                    'unit_amount': int(vehicle.total_amount * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{settings.FRONTEND_URL}/vehicles/{vehicle_id}?payment=success',
            cancel_url=f'{settings.FRONTEND_URL}/vehicles/{vehicle_id}?payment=cancelled',
            metadata={
                'vehicle_id': vehicle_id,
                'payment_type': 'vehicle_shipping',
                'user_id': request.user.id,
            },
            customer_email=vehicle.user.email,
        )
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            amount=vehicle.total_amount,
            currency='USD',
            payment_type='vehicle_shipping',
            status='pending',
            stripe_checkout_session_id=checkout_session.id,
            vehicle=vehicle,
            metadata={
                'vehicle_id': vehicle_id,
                'payment_type': 'vehicle_shipping',
            }
        )
        
        vehicle.status = 'payment_pending'
        vehicle.save()
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'payment_id': payment.payment_id,
        })
    except Exception as e:
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def receive_vehicle_at_warehouse(request, vehicle_id):
    """Warehouse worker receives vehicle and updates status"""
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
    except Vehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is admin/warehouse worker
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    receiving_notes = request.data.get('receiving_notes', '')
    
    vehicle.received_at_warehouse_at = timezone.now()
    vehicle.warehouse_receiving_notes = receiving_notes
    vehicle.status = 'received_at_warehouse'
    vehicle.save()
    
    # Update shipment status if exists
    if vehicle.shipment:
        old_status = vehicle.shipment.status
        vehicle.shipment.status = 'processing'
        vehicle.shipment.save()
        
        # Create TrackingUpdate
        TrackingUpdate.objects.create(
            shipment=vehicle.shipment,
            status='received_at_warehouse',
            location=vehicle.shipment.origin_address.get('city', '') if vehicle.shipment.origin_address else '',
            timestamp=timezone.now(),
            source='manual',
            raw_data={
                'old_status': old_status,
                'new_status': 'processing',
                'updated_by': request.user.email,
                'vehicle_id': vehicle_id,
                'notes': receiving_notes,
            }
        )
    
    serializer = VehicleSerializer(vehicle)
    return Response(serializer.data)

