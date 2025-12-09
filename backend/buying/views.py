from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from .models import BuyingRequest, BuyAndShipQuote
from .serializers import BuyingRequestSerializer, BuyAndShipQuoteSerializer
from .services.quote_generator import QuoteGenerator
from .services.email_service import (
    send_quote_created_user_email,
    send_quote_created_agent_email,
    send_payment_received_agent_email,
    send_payment_receipt_user_email
)
from logistics.models import Package
from logistics.services.pricing_calculator import PricingCalculator
from logistics.services.easyship_service import EasyShipService
from payments.models import Payment
import stripe
from django.conf import settings


class BuyingRequestViewSet(viewsets.ModelViewSet):
    """Buy & Ship request management"""
    serializer_class = BuyingRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return BuyingRequest.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Override create to add logging and ensure proper user assignment"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=" * 80)
        logger.info("BuyingRequestViewSet.create() called")
        logger.info(f"User ID: {request.user.id}")
        logger.info(f"Request data: {request.data}")
        logger.warning("ViewSet create method called - this should use the custom create_buying_request view instead!")
        logger.info("=" * 80)
        
        # Call parent create which will use perform_create
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"perform_create called - saving with user {self.request.user.id}")
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_quotes(request):
    """Preview approximate quotes without creating buying request"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Get form data
    shipping_address = request.data.get('shipping_address', {})
    weight = request.data.get('weight')
    dimensions = request.data.get('dimensions', {'length': 10, 'width': 10, 'height': 10})
    price = request.data.get('price')
    item_type = request.data.get('item_type')  # 'vehicle', 'car', or None
    
    # Validate required fields for quote calculation
    if not shipping_address or not shipping_address.get('country'):
        return Response(
            {'error': 'Shipping address with country is required for quote preview'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # For vehicles, weight and price are still required but dimensions might be larger
    if not weight or not price:
        return Response(
            {'error': 'Weight and price are required for quote preview'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create a temporary buying request object for quote calculation
        # We won't save it to the database
        from buying.models import BuyingRequest
        
        temp_request = BuyingRequest(
            user=request.user,
            product_description=request.data.get('product_description', ''),
            shipping_address=shipping_address,
            approximate_quote_data={
                'weight': float(weight),
                'dimensions': dimensions,
                'declared_value': float(price),
                'item_type': item_type,  # Store item type (vehicle/car) for category determination
            }
        )
        
        # Generate approximate quotes
        generator = QuoteGenerator()
        product_price = float(price)
        buying_fee_percent = generator.get_buying_fee_percent()
        buying_fee = generator.calculate_buying_fee(Decimal(str(product_price)), buying_fee_percent)
        
        # Generate shipping quotes
        shipping_quotes = generator.generate_shipping_quotes(
            temp_request,
            weight=float(weight),
            dimensions=dimensions,
            declared_value=product_price
        )
        
        # Format approximate quotes with full cost breakdown
        approximate_quotes = []
        logger.info(f"Formatting {len(shipping_quotes)} shipping quotes for preview")
        for quote in shipping_quotes:
            # Extract shipping cost (this is warehouse to destination cost)
            # Route-based quotes use 'total', EasyShip quotes also use 'total'
            shipping_cost = float(quote.get('total', quote.get('total_cost', 0)))
            logger.info(f"Quote: {quote.get('transport_mode_name', quote.get('transport_mode', 'unknown'))}, shipping_cost from quote: {shipping_cost}, quote keys: {list(quote.keys())}")
            
            # For international parcels, we might have leg1 and leg2 costs
            if quote.get('is_international_parcel'):
                leg1_cost = float(quote.get('leg1_easyship', {}).get('total', quote.get('leg1_easyship', {}).get('total_cost', 0)))
                leg2_cost = float(quote.get('leg2_route', {}).get('total', quote.get('leg2_route', {}).get('total_cost', 0)))
                shipping_cost = leg1_cost + leg2_cost
                logger.info(f"International parcel: leg1={leg1_cost}, leg2={leg2_cost}, total={shipping_cost}")
            
            total_cost = product_price + float(buying_fee) + shipping_cost
            logger.info(f"Final breakdown: product={product_price}, buying_fee={buying_fee}, shipping={shipping_cost}, total={total_cost}")
            
            # Get transport mode name (route-based quotes use transport_mode_name)
            transport_mode_name = quote.get('transport_mode_name') or quote.get('transport_mode', '')
            transport_mode_code = quote.get('transport_mode_code') or quote.get('transport_mode', '')
            
            # Get service name
            service_name = quote.get('service_name') or quote.get('transport_mode_name', '')
            
            # Get transit days (could be tuple or single value)
            transit_days = quote.get('transit_days')
            if isinstance(transit_days, tuple):
                transit_days_display = transit_days[0] if len(transit_days) > 0 else None
            else:
                transit_days_display = transit_days
            
            approximate_quotes.append({
                'transport_mode': transport_mode_name,
                'transport_mode_code': transport_mode_code,
                'service_name': service_name,
                'transit_days': transit_days_display,
                'carrier': quote.get('carrier', ''),
                'is_international_parcel': quote.get('is_international_parcel', False),
                'cost_breakdown': {
                    'product_cost': product_price,
                    'buying_fee_percent': float(buying_fee_percent),
                    'buying_fee': float(buying_fee),
                    'shipping_cost': shipping_cost,
                    'total_cost': total_cost,
                },
                'total_cost': total_cost,
                # Store full quote data for later use
                'quote_data': quote,
            })
        
        return Response({
            'approximate_quotes': approximate_quotes,
            'message': 'Quotes calculated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error previewing quotes: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Failed to calculate quotes: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_buying_request(request):
    """Create a new buying request with optional immediate quote"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Log incoming request data for debugging
    logger.info("=" * 80)
    logger.info("CREATING BUYING REQUEST")
    logger.info(f"User ID: {request.user.id}")
    logger.info(f"User Email: {request.user.email}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request path: {request.path}")
    logger.info(f"Request data type: {type(request.data)}")
    logger.info(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
    logger.info(f"Full request data: {request.data}")
    logger.info(f"Request META keys: {list(request.META.keys())}")
    logger.info(f"Content-Type: {request.META.get('CONTENT_TYPE', 'N/A')}")
    
    product_url = request.data.get('product_url', '')
    product_description = request.data.get('product_description', '')
    product_name = request.data.get('product_name', '')
    product_image = request.data.get('product_image', '')
    shipping_address = request.data.get('shipping_address', {})
    
    logger.info(f"Extracted product_url: {product_url[:100] if product_url else 'None'}...")
    logger.info(f"Extracted product_description: {product_description[:100] if product_description else 'None'}...")
    logger.info(f"Extracted product_name: {product_name}")
    logger.info(f"Extracted product_image: {product_image[:100] if product_image else 'None'}...")
    logger.info(f"Extracted shipping_address type: {type(shipping_address)}")
    logger.info(f"Extracted shipping_address: {shipping_address}")
    
    # Optional immediate quote data
    approximate_quote_data = {}
    item_type = request.data.get('item_type')  # 'vehicle', 'car', or None
    if request.data.get('weight') or request.data.get('price'):
        approximate_quote_data = {
            'weight': request.data.get('weight'),
            'dimensions': request.data.get('dimensions', {'length': 10, 'width': 10, 'height': 10}),
            'declared_value': request.data.get('price', 0),
        }
        # Add item_type if provided (for vehicle/car category)
        if item_type:
            approximate_quote_data['item_type'] = item_type
        logger.info(f"Approximate quote data provided: {approximate_quote_data}")
    
    # Validate required fields
    if not product_description and not product_url:
        logger.warning("Validation failed: Product URL or description is required")
        return Response(
            {'error': 'Product URL or description is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate shipping address
    if not shipping_address:
        logger.warning("Validation failed: Shipping address is required")
        return Response(
            {'error': 'Shipping address is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate shipping address required fields
    required_address_fields = ['full_name', 'street_address', 'city', 'postal_code', 'country']
    missing_fields = [field for field in required_address_fields if not shipping_address.get(field)]
    if missing_fields:
        logger.warning(f"Validation failed: Missing shipping address fields: {missing_fields}")
        return Response(
            {'error': f'Shipping address missing required fields: {", ".join(missing_fields)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        logger.info("Attempting to create BuyingRequest object...")
        logger.info(f"User object: {request.user}")
        logger.info(f"User ID: {request.user.id}")
        logger.info(f"Product URL: {product_url or None}")
        logger.info(f"Product description length: {len(product_description) if product_description else 0}")
        logger.info(f"Shipping address keys: {list(shipping_address.keys()) if isinstance(shipping_address, dict) else 'Not a dict'}")
        
        buying_request = BuyingRequest.objects.create(
            user=request.user,
            product_url=product_url or None,
            product_description=product_description,
            product_name=product_name or None,
            product_image=product_image or None,
            shipping_address=shipping_address,
            approximate_quote_data=approximate_quote_data if approximate_quote_data else {},
            status='pending'
        )
        logger.info(f"✓ Successfully created buying request ID: {buying_request.id}")
        logger.info(f"  Reference number: {buying_request.reference_number}")
        logger.info(f"  Status: {buying_request.status}")
    except Exception as e:
        logger.error("✗ ERROR creating buying request")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.error(f"Exception args: {e.args}")
        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response(
            {'error': f'Failed to create buying request: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Send email to agent
    try:
        send_quote_created_agent_email(buying_request)
    except Exception as e:
        # Log error but don't fail the request
        pass
    
    logger.info("Serializing response data...")
    serializer = BuyingRequestSerializer(buying_request)
    response_data = serializer.data
    logger.info(f"Serialized data keys: {list(response_data.keys())}")
    
    # If user provided size/price, calculate approximate quote using full logistics calculation
    if approximate_quote_data and approximate_quote_data.get('declared_value'):
        try:
            logger.info("Calculating approximate quotes using full logistics calculation...")
            generator = QuoteGenerator()
            
            # Get product price from approximate quote data
            product_price = float(approximate_quote_data.get('declared_value', 0))
            weight = approximate_quote_data.get('weight', 1.0)
            dimensions = approximate_quote_data.get('dimensions', {'length': 10, 'width': 10, 'height': 10})
            
            # Get buying fee percentage
            buying_fee_percent = generator.get_buying_fee_percent()
            buying_fee = generator.calculate_buying_fee(Decimal(str(product_price)), buying_fee_percent)
            
            # Generate shipping quotes using full logistics calculation (warehouse to destination)
            shipping_quotes = generator.generate_shipping_quotes(
                buying_request,
                weight=weight,
                dimensions=dimensions,
                declared_value=product_price
            )
            
            # Format approximate quotes with full cost breakdown
            approximate_quotes = []
            for quote in shipping_quotes:
                # Extract shipping cost (this is warehouse to destination cost)
                # Route-based quotes use 'total', EasyShip quotes also use 'total'
                shipping_cost = float(quote.get('total', quote.get('total_cost', 0)))
                
                # For international parcels, we might have leg1 and leg2 costs
                if quote.get('is_international_parcel'):
                    leg1_cost = float(quote.get('leg1_easyship', {}).get('total', quote.get('leg1_easyship', {}).get('total_cost', 0)))
                    leg2_cost = float(quote.get('leg2_route', {}).get('total', quote.get('leg2_route', {}).get('total_cost', 0)))
                    shipping_cost = leg1_cost + leg2_cost
                
                total_cost = float(product_price) + float(buying_fee) + shipping_cost
                
                # Get transport mode name (route-based quotes use transport_mode_name)
                transport_mode_name = quote.get('transport_mode_name') or quote.get('transport_mode', '')
                transport_mode_code = quote.get('transport_mode_code') or quote.get('transport_mode', '')
                
                # Get service name
                service_name = quote.get('service_name') or quote.get('transport_mode_name', '')
                
                # Get transit days (could be tuple or single value)
                transit_days = quote.get('transit_days')
                if isinstance(transit_days, tuple):
                    transit_days_display = transit_days[0] if len(transit_days) > 0 else None
                else:
                    transit_days_display = transit_days
                
                approximate_quotes.append({
                    'transport_mode': transport_mode_name,
                    'transport_mode_code': transport_mode_code,
                    'service_name': service_name,
                    'transit_days': transit_days_display,
                    'carrier': quote.get('carrier', ''),
                    'is_international_parcel': quote.get('is_international_parcel', False),
                    'cost_breakdown': {
                        'product_cost': product_price,
                        'buying_fee_percent': float(buying_fee_percent),
                        'buying_fee': float(buying_fee),
                        'shipping_cost': shipping_cost,
                        'total_cost': total_cost,
                    },
                    'total_cost': total_cost,
                    # Store full quote data for later use
                    'quote_data': quote,
                })
            
            response_data['approximate_quotes'] = approximate_quotes
            logger.info(f"Generated {len(approximate_quotes)} approximate quotes")
        except Exception as e:
            logger.warning(f"Failed to generate approximate quotes: {str(e)}")
            import traceback
            logger.warning(traceback.format_exc())
            pass
    
    logger.info(f"✓ Returning success response with status 201")
    logger.info("=" * 80)
    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_quotes(request, request_id):
    """Agent creates quote(s) for buying request (can create multiple with different shipping options)"""
    try:
        buying_request = BuyingRequest.objects.get(id=request_id)
    except BuyingRequest.DoesNotExist:
        return Response({'error': 'Buying request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update product details
    product_cost = request.data.get('product_cost')
    product_name = request.data.get('product_name', '')
    product_image = request.data.get('product_image', '')
    buying_fee_percent = request.data.get('buying_fee_percent')
    
    # Optional: Agent can provide weight/dimensions (overrides approximate_quote_data)
    weight = request.data.get('weight')
    dimensions = request.data.get('dimensions')
    sales_tax = request.data.get('sales_tax')
    domestic_shipping = request.data.get('domestic_shipping')
    
    # Update product name and image
    if product_name:
        buying_request.product_name = product_name
    if product_image:
        buying_request.product_image = product_image
    
    # Update approximate_quote_data if agent provided data
    if weight or dimensions or product_cost or sales_tax or domestic_shipping:
        if not buying_request.approximate_quote_data:
            buying_request.approximate_quote_data = {}
        if weight:
            buying_request.approximate_quote_data['weight'] = float(weight)
        if dimensions:
            buying_request.approximate_quote_data['dimensions'] = dimensions
        if product_cost:
            buying_request.approximate_quote_data['declared_value'] = float(product_cost)
        if sales_tax:
            buying_request.approximate_quote_data['sales_tax'] = float(sales_tax)
        if domestic_shipping:
            buying_request.approximate_quote_data['domestic_shipping'] = float(domestic_shipping)
    
    buying_request.save()
    
    generator = QuoteGenerator()
    created_quotes = []
    
    # Check if creating single quote or multiple quotes
    shipping_modes = request.data.get('shipping_modes', [])
    
    if shipping_modes:
        # Create quotes for specific shipping modes
        # First, get all available quotes to extract quote_data (using agent-provided or approximate data)
        quote_weight = weight or (buying_request.approximate_quote_data.get('weight') if buying_request.approximate_quote_data else None)
        quote_dimensions = dimensions or (buying_request.approximate_quote_data.get('dimensions') if buying_request.approximate_quote_data else None)
        quote_declared_value = float(product_cost) if product_cost else (buying_request.approximate_quote_data.get('declared_value') if buying_request.approximate_quote_data else None)
        
        # Get sales_tax and domestic_shipping from approximate_quote_data if provided
        quote_sales_tax = float(sales_tax) if sales_tax else (buying_request.approximate_quote_data.get('sales_tax') if buying_request.approximate_quote_data else None)
        quote_domestic_shipping = float(domestic_shipping) if domestic_shipping else (buying_request.approximate_quote_data.get('domestic_shipping') if buying_request.approximate_quote_data else None)
        
        all_shipping_quotes = generator.generate_shipping_quotes(
            buying_request,
            weight=quote_weight,
            dimensions=quote_dimensions,
            declared_value=quote_declared_value
        )
        quote_data_map = {q.get('transport_mode_code'): q for q in all_shipping_quotes}
        
        for mode_data in shipping_modes:
            mode_code = mode_data.get('code')
            shipping_cost_override = mode_data.get('shipping_cost')
            estimated_days = mode_data.get('estimated_days')
            service_name = mode_data.get('service_name')
            
            quote = generator.create_quote_for_shipping_mode(
                buying_request=buying_request,
                shipping_mode_code=mode_code,
                shipping_cost_override=shipping_cost_override,
                estimated_days=estimated_days,
                service_name=service_name,
                fee_percent=buying_fee_percent,
                product_cost=quote_declared_value,
                sales_tax=quote_sales_tax,
                domestic_shipping=quote_domestic_shipping
            )
            
            # Store quote data if available from generated quotes
            if mode_code in quote_data_map:
                quote.quote_data = quote_data_map[mode_code].copy()
                quote.save()
            
            created_quotes.append(quote)
    else:
        # Auto-create quotes for all available shipping modes
        # Use agent-provided weight/dimensions if available
        quote_weight = weight or (buying_request.approximate_quote_data.get('weight') if buying_request.approximate_quote_data else None)
        quote_dimensions = dimensions or (buying_request.approximate_quote_data.get('dimensions') if buying_request.approximate_quote_data else None)
        quote_declared_value = float(product_cost) if product_cost else (buying_request.approximate_quote_data.get('declared_value') if buying_request.approximate_quote_data else None)
        
        # Temporarily update approximate_quote_data for quote generation
        original_data = buying_request.approximate_quote_data.copy() if buying_request.approximate_quote_data else {}
        if quote_weight or quote_dimensions or quote_declared_value:
            if not buying_request.approximate_quote_data:
                buying_request.approximate_quote_data = {}
            if quote_weight:
                buying_request.approximate_quote_data['weight'] = quote_weight
            if quote_dimensions:
                buying_request.approximate_quote_data['dimensions'] = quote_dimensions
            if quote_declared_value:
                buying_request.approximate_quote_data['declared_value'] = quote_declared_value
            buying_request.save()
        
        created_quotes = generator.create_all_shipping_quotes(
            buying_request=buying_request,
            fee_percent=buying_fee_percent
        )
        
        # Restore original data if we modified it
        if original_data != buying_request.approximate_quote_data:
            buying_request.approximate_quote_data = original_data
            buying_request.save()
    
    # Update buying request status
    buying_request.status = 'quoted'
    buying_request.save()
    
    # Send emails
    try:
        send_quote_created_user_email(buying_request, created_quotes)
    except Exception as e:
        pass
    
    serializer = BuyAndShipQuoteSerializer(created_quotes, many=True)
    return Response({
        'buying_request': BuyingRequestSerializer(buying_request).data,
        'quotes': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quotes(request, request_id):
    """Get all quotes for a buying request"""
    try:
        buying_request = BuyingRequest.objects.get(id=request_id, user=request.user)
    except BuyingRequest.DoesNotExist:
        return Response({'error': 'Buying request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    quotes = BuyAndShipQuote.objects.filter(buying_request=buying_request)
    serializer = BuyAndShipQuoteSerializer(quotes, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_quote(request, quote_id):
    """User approves a quote and creates payment session"""
    try:
        quote = BuyAndShipQuote.objects.get(id=quote_id, buying_request__user=request.user)
    except BuyAndShipQuote.DoesNotExist:
        return Response({'error': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if quote.status != 'pending':
        return Response(
            {'error': 'Quote is not available for approval'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    buying_request = quote.buying_request
    
    # Create Stripe checkout session
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Buy & Ship: {buying_request.product_name or "Product"}',
                        'description': f'Quote #{quote.id} - {quote.shipping_mode.name if quote.shipping_mode else "Standard Shipping"}',
                    },
                    'unit_amount': int(float(quote.total_cost) * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/buy-ship/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/buy-ship/quotes?quote_id={quote_id}",
            metadata={
                'user_id': str(request.user.id),
                'buying_request_id': str(buying_request.id),
                'quote_id': str(quote.id),
                'payment_type': 'buy_and_ship_quote',
            },
            customer_email=request.user.email,
        )
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            stripe_checkout_session_id=checkout_session.id,
            amount=float(quote.total_cost),
            currency='USD',
            payment_type='buy_and_ship_quote',  # Use consistent payment type
            metadata={
                'buying_request_id': str(buying_request.id),
                'quote_id': str(quote.id),
                'payment_type': 'buy_and_ship_quote',  # Also store in metadata for webhook
            },
            buying_request=buying_request,
            status='pending'
        )
        
        # Update quote and buying request status
        quote.status = 'approved'
        quote.save()
        buying_request.status = 'payment_pending'
        buying_request.save()
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'payment_id': payment.payment_id,
            'quote': BuyAndShipQuoteSerializer(quote).data
        })
        
    except stripe.error.StripeError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def mark_purchased(request, request_id):
    """Agent marks item as purchased and generates reference number"""
    try:
        buying_request = BuyingRequest.objects.get(id=request_id)
    except BuyingRequest.DoesNotExist:
        return Response({'error': 'Buying request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if buying_request.status != 'payment_received':
        return Response(
            {'error': 'Payment must be received before marking as purchased'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    purchase_receipt = request.data.get('purchase_receipt', '')
    purchase_tracking = request.data.get('purchase_tracking', '')
    
    # Generate reference number
    reference_number = buying_request.generate_reference_number()
    
    buying_request.status = 'purchased'
    buying_request.purchase_receipt = purchase_receipt
    buying_request.purchase_tracking = purchase_tracking
    buying_request.purchase_date = timezone.now()
    buying_request.reference_number = reference_number
    buying_request.save()
    
    serializer = BuyingRequestSerializer(buying_request)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_dashboard(request):
    """Get user's buying requests with quotes for dashboard"""
    buying_requests = BuyingRequest.objects.filter(user=request.user).prefetch_related('quotes')
    
    data = []
    for br in buying_requests:
        quotes = BuyAndShipQuote.objects.filter(buying_request=br)
        data.append({
            'buying_request': BuyingRequestSerializer(br).data,
            'quotes': BuyAndShipQuoteSerializer(quotes, many=True).data
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_quotes(request):
    """Get all quotes for the authenticated user across all buying requests"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Listing all quotes for user {request.user.id}")
    
    # Get status filter from query params
    status_filter = request.query_params.get('status', None)
    search_query = request.query_params.get('search', None)
    
    # Get all quotes for user's buying requests
    quotes = BuyAndShipQuote.objects.filter(
        buying_request__user=request.user
    ).select_related('buying_request', 'shipping_mode').order_by('-created_at')
    
    # Apply status filter if provided
    if status_filter:
        quotes = quotes.filter(status=status_filter)
        logger.info(f"Filtered by status: {status_filter}")
    
    # Apply search filter if provided (search in product name or description)
    if search_query:
        quotes = quotes.filter(
            Q(buying_request__product_name__icontains=search_query) |
            Q(buying_request__product_description__icontains=search_query)
        )
        logger.info(f"Filtered by search: {search_query}")
    
    serializer = BuyAndShipQuoteSerializer(quotes, many=True)
    
    # Include buying request info for each quote
    result = []
    for quote_data in serializer.data:
        quote_obj = quotes.get(id=quote_data['id'])
        quote_dict = quote_data.copy()
        quote_dict['buying_request'] = {
            'id': quote_obj.buying_request.id,
            'product_name': quote_obj.buying_request.product_name,
            'product_description': quote_obj.buying_request.product_description,
            'product_image': quote_obj.buying_request.product_image,
            'reference_number': quote_obj.buying_request.reference_number,
            'status': quote_obj.buying_request.status,
            'created_at': quote_obj.buying_request.created_at.isoformat() if quote_obj.buying_request.created_at else None,
        }
        result.append(quote_dict)
    
    logger.info(f"Returning {len(result)} quotes")
    return Response(result)

