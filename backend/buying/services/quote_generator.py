from decimal import Decimal
from logistics.services.pricing_calculator import PricingCalculator
from logistics.models import TransportMode, Country


class QuoteGenerator:
    """Generate quotes for buying requests with automatic shipping calculation"""
    
    def __init__(self):
        self.pricing_calculator = PricingCalculator()
    
    def get_buying_fee_percent(self, custom_percent=None):
        """Get buying fee percentage (hardcoded 7.5% or custom)"""
        if custom_percent:
            return Decimal(str(custom_percent))
        
        return Decimal('7.50')  # Hardcoded 7.5%
    
    def calculate_buying_fee(self, product_cost, fee_percent=None):
        """Calculate buying service fee"""
        fee_percent = self.get_buying_fee_percent(fee_percent)
        return product_cost * (fee_percent / Decimal('100'))
    
    def generate_shipping_quotes(self, buying_request, weight=None, dimensions=None, declared_value=None):
        """
        Generate shipping quotes for all available transport modes (warehouse to destination)
        
        Args:
            buying_request: BuyingRequest instance
            weight: Optional weight override (kg)
            dimensions: Optional dimensions override {length, width, height} in cm
            declared_value: Optional declared value override
        
        Returns:
            List of quote dictionaries with shipping options
        """
        # Get shipping address (destination)
        shipping_address = buying_request.shipping_address
        if not shipping_address or not shipping_address.get('country'):
            return []
        
        destination_country = shipping_address.get('country')
        
        # Warehouse is in US (origin)
        origin_country = 'US'
        
        # Use provided values or defaults
        weight = weight or buying_request.approximate_quote_data.get('weight', 1.0)
        dimensions = dimensions or buying_request.approximate_quote_data.get('dimensions', {'length': 10, 'width': 10, 'height': 10})
        # Get declared value from approximate_quote_data or from existing quotes
        declared_value = declared_value
        if not declared_value and buying_request.approximate_quote_data:
            declared_value = float(buying_request.approximate_quote_data.get('declared_value', 0))
        if not declared_value:
            # Try to get from existing quotes
            existing_quote = buying_request.quotes.first()
            if existing_quote:
                declared_value = float(existing_quote.product_cost)
        
        # Determine shipping category
        # Check if user specified vehicle/car category
        item_type = None
        if hasattr(buying_request, 'approximate_quote_data') and buying_request.approximate_quote_data:
            item_type = buying_request.approximate_quote_data.get('item_type')
        
        if item_type == 'vehicle' or item_type == 'car':
            shipping_category = 'vehicle'
        else:
            weight_float = float(weight)
            if weight_float < 30:
                shipping_category = 'small_parcel'
            elif weight_float < 100:
                shipping_category = 'heavy_parcel'
            elif weight_float < 4000:
                shipping_category = 'ltl_freight'
            else:
                shipping_category = 'ftl_freight'
        
        # Get warehouse address for the shipping category
        warehouse_address = self.pricing_calculator.get_warehouse_address(origin_country, shipping_category)
        if not warehouse_address:
            # Fallback to default US warehouse
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
        
        # Get all quotes from pricing calculator (warehouse to destination only)
        # For buy-and-ship, skip origin-to-warehouse leg (marketplace ships directly to warehouse)
        quotes = self.pricing_calculator.get_all_quotes(
            origin_country=origin_country,
            destination_country=destination_country,
            weight=weight_float,
            dimensions=dimensions,
            declared_value=float(declared_value),
            items=None,
            shipping_category=shipping_category,
            origin_address=None,  # Not needed for buy-and-ship (marketplace ships to warehouse)
            warehouse_address=warehouse_address,
            destination_address=shipping_address,  # Full destination address
            skip_origin_to_warehouse=True  # Skip leg1: marketplace ships to warehouse directly
        )
        
        return quotes
    
    def create_quote_for_shipping_mode(self, buying_request, shipping_mode_code, shipping_cost_override=None, 
                                      estimated_days=None, service_name=None, fee_percent=None,
                                      product_cost=None, sales_tax=None, domestic_shipping=None):
        """
        Create a quote for a specific shipping mode
        
        Args:
            buying_request: BuyingRequest instance
            shipping_mode_code: Code of transport mode (e.g., 'air', 'sea')
            shipping_cost_override: Optional override for shipping cost
            estimated_days: Optional estimated delivery days
            service_name: Optional service name
            fee_percent: Optional custom buying fee percentage
            product_cost: Optional product cost (overrides approximate_quote_data)
            sales_tax: Optional sales tax (overrides approximate_quote_data)
            domestic_shipping: Optional domestic shipping cost (overrides approximate_quote_data)
        
        Returns:
            BuyAndShipQuote instance
        """
        from buying.models import BuyAndShipQuote
        
        # Get product costs from parameters, approximate_quote_data, or existing quotes
        # Priority: parameters > approximate_quote_data > existing quotes > default 0
        if product_cost is not None:
            product_cost = Decimal(str(product_cost))
        else:
            product_cost = Decimal('0')
            # Try to get from approximate_quote_data first
            if buying_request.approximate_quote_data:
                product_cost = Decimal(str(buying_request.approximate_quote_data.get('declared_value', 0)))
            
            # If no approximate data, try to get from existing quotes
            if product_cost == 0:
                existing_quote = buying_request.quotes.first()
                if existing_quote:
                    product_cost = existing_quote.product_cost
        
        if sales_tax is not None:
            sales_tax = Decimal(str(sales_tax))
        else:
            sales_tax = Decimal('0')
            # Try to get from approximate_quote_data
            if buying_request.approximate_quote_data:
                sales_tax = Decimal(str(buying_request.approximate_quote_data.get('sales_tax', 0)))
            # If not in approximate data, try existing quotes
            if sales_tax == 0:
                existing_quote = buying_request.quotes.first()
                if existing_quote:
                    sales_tax = existing_quote.sales_tax
        
        if domestic_shipping is not None:
            domestic_shipping = Decimal(str(domestic_shipping))
        else:
            domestic_shipping = Decimal('0')
            # Try to get from approximate_quote_data
            if buying_request.approximate_quote_data:
                domestic_shipping = Decimal(str(buying_request.approximate_quote_data.get('domestic_shipping', 0)))
            # If not in approximate data, try existing quotes
            if domestic_shipping == 0:
                existing_quote = buying_request.quotes.first()
                if existing_quote:
                    domestic_shipping = existing_quote.domestic_shipping_cost
        
        # Calculate buying fee
        buying_fee_percent = self.get_buying_fee_percent(fee_percent)
        buying_fee = self.calculate_buying_fee(product_cost, buying_fee_percent)
        
        # Get shipping cost and quote data
        quote_data_to_store = {}
        if shipping_cost_override:
            shipping_cost = Decimal(str(shipping_cost_override))
        else:
            # Auto-calculate shipping
            quotes = self.generate_shipping_quotes(buying_request)
            shipping_cost = Decimal('0')
            
            # Find matching quote for this shipping mode
            for quote in quotes:
                if quote.get('transport_mode_code') == shipping_mode_code:
                    shipping_cost = Decimal(str(quote.get('total_cost', 0)))
                    if not estimated_days:
                        estimated_days = quote.get('transit_days')
                    if not service_name:
                        service_name = quote.get('service_name', '')
                    
                    # Store full quote data for shipment creation
                    quote_data_to_store = quote.copy()
                    break
        
        # Get transport mode
        transport_mode = None
        try:
            transport_mode = TransportMode.objects.get(code=shipping_mode_code)
        except TransportMode.DoesNotExist:
            pass
        
        # Calculate total
        total_cost = product_cost + sales_tax + buying_fee + domestic_shipping + shipping_cost
        
        # Create quote
        quote = BuyAndShipQuote.objects.create(
            buying_request=buying_request,
            product_cost=product_cost,
            sales_tax=sales_tax,
            buying_service_fee=buying_fee,
            buying_service_fee_percent=buying_fee_percent,
            domestic_shipping_cost=domestic_shipping,
            shipping_mode=transport_mode,
            shipping_cost=shipping_cost,
            shipping_service_name=service_name or '',
            estimated_delivery_days=estimated_days,
            total_cost=total_cost,
            status='pending',
            quote_data=quote_data_to_store  # Store full quote data for shipment creation
        )
        
        return quote
    
    def create_all_shipping_quotes(self, buying_request, fee_percent=None):
        """
        Create quotes for all available shipping modes automatically
        
        Returns:
            List of BuyAndShipQuote instances
        """
        # Generate shipping quotes
        shipping_quotes = self.generate_shipping_quotes(buying_request)
        
        created_quotes = []
        
        # Create a quote for each available shipping mode
        for shipping_quote in shipping_quotes:
            # Route-based quotes use 'transport_mode' (e.g., 'AIR', 'SEA'), not 'transport_mode_code'
            mode_code = shipping_quote.get('transport_mode_code') or shipping_quote.get('transport_mode')
            if mode_code:
                # Get shipping cost (route-based quotes use 'total', not 'total_cost')
                shipping_cost = shipping_quote.get('total', shipping_quote.get('total_cost', 0))
                
                # Get transit days (could be tuple or single value)
                transit_days = shipping_quote.get('transit_days')
                if isinstance(transit_days, tuple):
                    estimated_days = transit_days[0] if len(transit_days) > 0 else None
                else:
                    estimated_days = transit_days
                
                # Get service name
                service_name = shipping_quote.get('service_name') or shipping_quote.get('transport_mode_name', '')
                
                quote = self.create_quote_for_shipping_mode(
                    buying_request=buying_request,
                    shipping_mode_code=mode_code,
                    shipping_cost_override=shipping_cost,
                    estimated_days=estimated_days,
                    service_name=service_name,
                    fee_percent=fee_percent
                )
                # Store the full shipping quote data
                quote.quote_data = shipping_quote.copy()
                quote.save()
                created_quotes.append(quote)
        
        return created_quotes

