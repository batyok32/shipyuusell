"""
Pricing Calculator for different transport modes
"""
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import logging
from logistics.models import (
    ShippingRoute, TransportMode, 
    ShippingCalculationSettings, Country, Warehouse, PickupCalculationSettings
)
from logistics.services.easyship_service import EasyShipService
from django.db import models

logger = logging.getLogger(__name__)


class PricingCalculator:
    """Calculate shipping costs for different transport modes"""
    
    def __init__(self):
        self.easyship = EasyShipService()
        print("Initialized PricingCalculator.")

    def get_warehouse_address(self, origin_country, shipping_category='all'):
        """Get warehouse address from database based on country and category"""
        print(f"Getting warehouse address for origin_country: {origin_country}, shipping_category: {shipping_category}")
        if isinstance(origin_country, str):
            # Get country object
            try:
                origin_country = Country.objects.get(code=origin_country)
            except Country.DoesNotExist:
                print(f"Country with code {origin_country} does not exist.")
                return None
        elif not isinstance(origin_country, Country):
            print("origin_country is not a Country instance.")
            return None
        
        # Try to find warehouse matching category
        # Check if warehouse supports the requested category (either has 'all' or the specific category)
        warehouses = Warehouse.objects.filter(
            country=origin_country,
            is_active=True
        ).order_by('-priority')
        
        # Find warehouse that supports the requested category
        warehouse = None
        for w in warehouses:
            if w.supports_category(shipping_category):
                warehouse = w
                break
        
        if not warehouse:
            print("No warehouse found for the given country/category.")
            return None
        
        address = {
            'full_name': warehouse.full_name,
            'company': warehouse.company,
            'street_address': warehouse.street_address,
            'street_address_2': warehouse.street_address_2 or '',
            'city': warehouse.city,
            'state_province': warehouse.state_province or '',
            'postal_code': warehouse.postal_code or '',
            'country': warehouse.country.code,
            'phone': warehouse.phone or '',
            'email': 'warehouse@logistics.yuusell.com',  # Default email for warehouse
        }
        print(f"Found warehouse address: {address}")
        return address
    
    def calculate_distance_km(self, origin_address, warehouse_address):
        """Calculate approximate distance in km between origin and warehouse.
        This is a simplified calculation. For production, use a geocoding API."""
        # Handle case where addresses might be None or not dicts
        if not origin_address or not isinstance(origin_address, dict):
            print(f"Origin address is invalid: {origin_address}. Returning fallback distance: 50km.")
            return Decimal('50')  # Fallback distance
        if not warehouse_address or not isinstance(warehouse_address, dict):
            print(f"Warehouse address is invalid: {warehouse_address}. Returning fallback distance: 50km.")
            return Decimal('50')  # Fallback distance
        
        print(f"Calculating distance between origin_address: {origin_address} and warehouse_address: {warehouse_address}")
        origin_city = origin_address.get('city', '')
        warehouse_city = warehouse_address.get('city', '')
        origin_state = origin_address.get('state_province', '')
        warehouse_state = warehouse_address.get('state_province', '')
        origin_country = origin_address.get('country', '')
        warehouse_country = warehouse_address.get('country', '')
        
        if origin_country != warehouse_country:
            print("Origin and warehouse in different countries, returning 0km.")
            return Decimal('0')  # Different countries, no distance-based calculation
        
        if origin_state and warehouse_state and origin_state == warehouse_state:
            if origin_city == warehouse_city:
                print("Origin and warehouse in same city: 15km.")
                return Decimal('15')  # Same city: ~15km
            print("Origin and warehouse in same state, different city: 100km.")
            return Decimal('100')  # Same state, different city: ~100km
        elif origin_state and warehouse_state and origin_state != warehouse_state:
            print("Origin and warehouse in different states: 500km.")
            return Decimal('500')  # Different states: ~500km
        
        # Fallback
        print("Unknown state/city info; returning fallback distance: 50km.")
        return Decimal('50')
    
    def calculate_pickup_cost_custom(self, origin_address, warehouse_address, weight, dimensions, shipping_category='small_parcel'):
        """Calculate pickup cost using YuuSell's own calculation method"""
        try:
            print(f"Calculating pickup cost custom, origin_address: {origin_address}, warehouse_address: {warehouse_address}, weight: {weight}, dimensions: {dimensions}, shipping_category: {shipping_category}")
            
            # Handle case where origin_address might be a string or None
            if not origin_address:
                print("Origin address is None or empty. Returning 0.0.")
                return 0.0
            
            if isinstance(origin_address, str):
                print(f"Origin address is a string: {origin_address}. Cannot calculate pickup cost. Returning 0.0.")
                return 0.0
            
            if not isinstance(origin_address, dict):
                print(f"Origin address is not a dict: {type(origin_address)}. Returning 0.0.")
                return 0.0
            
            origin_country = origin_address.get('country', 'US')
            origin_state = origin_address.get('state_province', '')
            
            # Get country object
            try:
                country_obj = Country.objects.get(code=origin_country)
                print(f"Country object found: {country_obj}")
            except Country.DoesNotExist:
                print(f"Country with code {origin_country} does not exist. Returning 0.0.")
                return 0.0
            
            # Get pickup settings - try specific state/category first, then fallback
            settings = None
            
            # Try exact match: country + state + category
            if origin_state:
                settings = PickupCalculationSettings.objects.filter(
                    country=country_obj,
                    state=origin_state,
                    shipping_category__in=[shipping_category, 'all'],
                    is_active=True
                ).order_by('-shipping_category').first()  # Prefer specific category over 'all'
                print(f"PickupCalculationSettings with state: {settings}")
            
            # Fallback: country + category (no state)
            if not settings:
                settings = PickupCalculationSettings.objects.filter(
                    country=country_obj,
                    state='',
                    shipping_category__in=[shipping_category, 'all'],
                    is_active=True
                ).order_by('-shipping_category').first()
                print(f"PickupCalculationSettings with empty state: {settings}")
            
            # Fallback: country only (any category)
            if not settings:
                settings = PickupCalculationSettings.objects.filter(
                    country=country_obj,
                    shipping_category='all',
                    is_active=True
                ).first()
                print(f"PickupCalculationSettings country only: {settings}")
            
            # If no settings found, get global fallback defaults
            if not settings:
                logger.warning("No PickupCalculationSettings found; using global fallback defaults.")
                # Try to get global fallback settings
                fallback_settings = PickupCalculationSettings.objects.filter(
                    is_global_fallback=True,
                    is_active=True
                ).first()
                
                if fallback_settings:
                    base_fee = Decimal(str(fallback_settings.base_pickup_fee))
                    per_kg = Decimal(str(fallback_settings.per_kg_rate))
                    minimum = Decimal(str(fallback_settings.minimum_pickup_fee))
                    logger.info(f"Using fallback pickup settings: base={base_fee}, per_kg={per_kg}, min={minimum}")
                else:
                    # Last resort: hardcoded defaults (should create fallback settings in admin)
                    base_fee = Decimal('25.00')
                    per_kg = Decimal('0.50')
                    minimum = Decimal('15.00')
                    logger.warning("No fallback pickup settings configured; using hardcoded defaults. Please create PickupCalculationSettings with is_global_fallback=True.")
                
                weight_decimal = Decimal(str(weight))
                cost = base_fee + (weight_decimal * per_kg)
                result = float(max(cost, minimum))
                logger.debug(f"Default pickup cost: {result}")
                return result
            
            # Calculate dimensional weight if enabled
            chargeable_weight = Decimal(str(weight))
            if settings.use_dimensional_weight and dimensions:
                length = Decimal(str(dimensions.get('length', 0)))
                width = Decimal(str(dimensions.get('width', 0)))
                height = Decimal(str(dimensions.get('height', 0)))
                
                if length and width and height:
                    dim_weight = self.calculate_dimensional_weight(
                        float(length),
                        float(width),
                        float(height),
                        float(settings.dimensional_weight_divisor)
                    )
                    print(f"Dimensional weight: {dim_weight}. Actual: {chargeable_weight}")
                    chargeable_weight = max(chargeable_weight, dim_weight)
            
            print(f"Chargeable weight for pickup: {chargeable_weight}")
            # Calculate distance-based cost
            distance_km = self.calculate_distance_km(origin_address, warehouse_address)
            print(f"Distance in KM for pickup: {distance_km}")
            distance_cost = distance_km * settings.per_km_rate
            
            # Calculate weight-based cost
            weight_cost = chargeable_weight * settings.per_kg_rate
            print(f"Weight cost: {weight_cost}, Distance cost: {distance_cost}")
            
            # Base cost
            total_cost = settings.base_pickup_fee + weight_cost + distance_cost
            print(f"Base pickup cost: {total_cost}")
            
            # Add residential fee (assuming residential if no company name)
            if not origin_address.get('company'):
                print("Applying residential fee.")
                total_cost += settings.residential_fee
            
            # Add lift gate fee for heavy items
            if shipping_category in ['ltl_freight', 'ftl_freight', 'vehicle', 'super_heavy']:
                print("Applying lift gate fee for heavy items.")
                total_cost += settings.lift_gate_fee
            
            # Apply markup
            if settings.markup_percent > 0:
                markup = total_cost * (settings.markup_percent / Decimal('100'))
                print(f"Applying markup: {markup}")
                total_cost += markup
            
            # Ensure minimum fee
            if total_cost < settings.minimum_pickup_fee:
                print(f"Total cost {total_cost} is less than minimum {settings.minimum_pickup_fee}, using minimum.")
            total_cost = max(total_cost, settings.minimum_pickup_fee)
            
            result = float(total_cost)
            print(f"Final pickup cost: {result}")
            return result
        except Exception as e:
            # Log error and return fallback
            logger.error(f"Error calculating custom pickup cost: {str(e)}")
            print(f"Exception in calculate_pickup_cost_custom: {str(e)}")
            return 0.0
    
    def get_calculation_settings(self, route, transport_mode, shipping_category='small_parcel'):
        """Get calculation settings (route-specific or global default) filtered by category"""
        logger.debug(f"Fetching calculation settings for route {route}, mode {transport_mode}, category {shipping_category}")
        
        # Try route-specific first (with category match)
        if route:
            settings_obj = ShippingCalculationSettings.objects.filter(
                route=route,
                transport_mode=transport_mode,
                is_global_default=False
            ).first()
            
            # Check if settings support this category
            if settings_obj and settings_obj.supports_category(shipping_category):
                logger.debug(f"Found route-specific settings: {settings_obj}")
                return settings_obj
        
        # Fallback to global default (with category match)
        logger.debug("No route-specific calculation settings found, looking for global default.")
        global_settings = ShippingCalculationSettings.objects.filter(
            transport_mode=transport_mode,
            is_global_default=True
        )
        
        # Find settings that support this category
        for settings_obj in global_settings:
            if settings_obj.supports_category(shipping_category):
                logger.debug(f"Found global default settings: {settings_obj}")
                return settings_obj
        
        # If no category-specific settings found, try settings with empty categories (applies to all)
        for settings_obj in global_settings:
            if not settings_obj.shipping_categories:  # Empty list means all categories
                logger.debug(f"Found global default settings (all categories): {settings_obj}")
                return settings_obj
        
        # Create default if none exists
        logger.warning(f"No calculation settings found for {transport_mode} and category {shipping_category}, creating new one.")
        settings_obj = ShippingCalculationSettings.objects.create(
            transport_mode=transport_mode,
            is_global_default=True,
            shipping_categories=['all']  # Default to all categories
        )
        
        return settings_obj
    
    def calculate_dimensional_weight(self, length, width, height, divisor=5000):
        """Calculate dimensional weight: (L × W × H) / divisor"""
        print(f"Calculating dimensional weight for LxWxH: {length}x{width}x{height} / {divisor}")
        length_m = Decimal(str(length)) / Decimal('100')  # Convert cm to m
        width_m = Decimal(str(width)) / Decimal('100')
        height_m = Decimal(str(height)) / Decimal('100')
        result = length_m * width_m * height_m * Decimal('1000') / Decimal(str(divisor))  # Convert to kg
        print(f"Dimensional weight result: {result}")
        return result
    
    def determine_pickup_required(self, weight, category):
        """Determine if pickup is required based on weight and category"""
        print(f"Determining if pickup required for weight {weight} and category {category}")
        weight_threshold = Decimal(str(settings.SHIPPING_PICKUP_WEIGHT_THRESHOLD))
        if weight >= weight_threshold:
            print("Pickup required: weight threshold exceeded")
            return True
        if category in ['vehicle', 'super_heavy']:
            print("Pickup required: category triggers pickup")
            return True
        print("Pickup not required")
        return False
    
    def is_local_shipping(self, origin_country, destination_country):
        """Check if shipping is local (same country)"""
        print(f"Checking if shipping is local for {origin_country} to {destination_country}")
        if isinstance(origin_country, str):
            print(f"Result: {origin_country == destination_country}")
            return origin_country == destination_country
        print(f"Result: {origin_country.code == destination_country.code}")
        return origin_country.code == destination_country.code
    
    def is_pickup_available(self, origin_address, shipping_category='small_parcel'):
        """
        Check if pickup is available for the origin address and category.
        Pickup is only available if PickupCalculationSettings exists.
        Returns (is_available, settings_object)
        """
        if not origin_address or isinstance(origin_address, str):
            return False, None
        
        origin_country = origin_address.get('country', '')
        origin_state = origin_address.get('state_province', '')
        
        if not origin_country:
            return False, None
        
        try:
            country_obj = Country.objects.get(code=origin_country)
        except Country.DoesNotExist:
            return False, None
        
        # Try to find pickup settings - most specific first
        settings = None
        
        # 1. Try exact match: country + state + category
        if origin_state:
            settings = PickupCalculationSettings.objects.filter(
                country=country_obj,
                state=origin_state,
                shipping_category__in=[shipping_category, 'all'],
                is_active=True
            ).order_by('-shipping_category').first()
        
        # 2. Fallback: country + category (no state)
        if not settings:
            settings = PickupCalculationSettings.objects.filter(
                country=country_obj,
                state='',
                shipping_category__in=[shipping_category, 'all'],
                is_active=True
            ).order_by('-shipping_category').first()
        
        # 3. Final fallback: country only, 'all' category
        if not settings:
            settings = PickupCalculationSettings.objects.filter(
                country=country_obj,
                shipping_category='all',
                is_active=True
            ).first()
        
        return settings is not None, settings
    
    def get_international_parcel_quotes(self, origin_country, destination_country, weight, dimensions,
                                        declared_value=0, items=None, origin_address=None, 
                                        warehouse_address=None, destination_address=None, shipping_category='small_parcel'):
        """
        Get quotes for international parcels using two-leg shipping:
        1. User drop-off → Warehouse (EasyShip)
        2. Warehouse → Destination (routes from DB)
        
        Returns combined quotes with breakdown showing both legs.
        """
        print(f"Getting international parcel quotes with two-leg shipping")
        quotes = []
        
        # Step 1: Get EasyShip rates from origin to warehouse
        print(f"Step 1: Getting EasyShip rates from origin to warehouse")
        easyship_rates = self.easyship.get_rates(
            origin_country, 
            warehouse_address.get('country', origin_country) if warehouse_address else origin_country,
            weight, 
            dimensions, 
            declared_value, 
            items, 
            origin_address, 
            warehouse_address
        )
        
        if not easyship_rates:
            logger.warning("No EasyShip rates found for origin to warehouse. Cannot provide international parcel quotes.")
            return []  # Cannot proceed without EasyShip rates
        
        # Step 2: Get routes from warehouse to destination
        print(f"Step 2: Getting routes from warehouse to destination")
        # Get warehouse country from warehouse_address
        if isinstance(warehouse_address, dict):
            warehouse_country_code = warehouse_address.get('country', origin_country)
        else:
            warehouse_country_code = origin_country
        
        # Get country objects
        if isinstance(destination_country, str):
            try:
                destination_country_obj = Country.objects.get(code=destination_country)
            except Country.DoesNotExist:
                logger.error(f"Destination country {destination_country} not found in database")
                return []
        else:
            destination_country_obj = destination_country
            
        if isinstance(warehouse_country_code, str):
            try:
                warehouse_country_obj = Country.objects.get(code=warehouse_country_code)
            except Country.DoesNotExist:
                logger.error(f"Warehouse country {warehouse_country_code} not found in database")
                return []
        else:
            warehouse_country_obj = warehouse_country_code
        
        # Get available routes from warehouse country to destination
        routes = ShippingRoute.objects.filter(
            origin_country=warehouse_country_obj,
            destination_country=destination_country_obj,
            is_available=True
        ).select_related('transport_mode')
        
        if not routes.exists():
            logger.warning(f"No routes found from warehouse ({warehouse_country_code}) to destination ({destination_country}). Cannot provide international parcel quotes.")
            return []  # Cannot proceed without routes
        
        # Filter transport modes based on category
        allowed_modes = []
        if shipping_category == 'small_parcel':
            allowed_modes = ['air']
        elif shipping_category == 'heavy_parcel':
            allowed_modes = ['air', 'sea']
        else:
            allowed_modes = ['air', 'sea', 'rail', 'truck']
        
        print(f"Allowed transport modes for category {shipping_category}: {allowed_modes}")
        print(f"Found {routes.count()} routes from warehouse to destination")
        
        # Step 3: Combine EasyShip rates with route quotes
        logger.info(f"Processing {len(easyship_rates)} EasyShip rates for international parcel quotes")
        for idx, easyship_rate in enumerate(easyship_rates):
            easyship_cost = float(easyship_rate.get('total_charge', 0))
            # Try multiple possible fields for rate ID
            easyship_rate_id = (
                easyship_rate.get('id') or
                easyship_rate.get('easyship_rate_id') or
                easyship_rate.get('rate_id')
            )
            logger.info(f"Rate #{idx+1} - Keys: {list(easyship_rate.keys())}, ID extracted: {easyship_rate_id}, Cost: {easyship_cost}")
            if not easyship_rate_id:
                logger.warning(f"Rate #{idx+1} has NO ID! Full rate structure: {easyship_rate}")
            carrier_name = easyship_rate.get('courier_service', {}).get('name', 'Unknown Carrier')
            service_name = easyship_rate.get('courier_service', {}).get('name', 'Standard Service')
            transit_days_to_warehouse = (
                easyship_rate.get('min_delivery_time', 0),
                easyship_rate.get('max_delivery_time', 0)
            )
            
            # For each route from warehouse to destination
            for route in routes:
                mode_type = route.transport_mode.type
                
                if mode_type not in allowed_modes:
                    continue
                
                # Calculate route cost from warehouse to destination
                if mode_type == 'air':
                    route_quote = self.calculate_air_freight(route, weight, dimensions, declared_value, shipping_category)
                elif mode_type == 'sea':
                    route_quote = self.calculate_sea_freight(route, weight, dimensions, declared_value, shipping_category)
                elif mode_type == 'rail':
                    route_quote = self.calculate_rail_freight(route, weight, dimensions, declared_value, shipping_category)
                elif mode_type == 'truck':
                    route_quote = self.calculate_truck_freight(route, weight, dimensions, declared_value, 70, shipping_category)
                else:
                    continue
                
                # Combine both legs
                combined_total = easyship_cost + route_quote['total']
                combined_transit_days = (
                    transit_days_to_warehouse[0] + route_quote['transit_days'][0],
                    transit_days_to_warehouse[1] + route_quote['transit_days'][1]
                )
                
                # Create combined quote
                # Ensure we have a rate ID - check the full rate object before creating the quote
                if not easyship_rate_id and isinstance(easyship_rate, dict):
                    # Try to get ID from nested structures
                    easyship_rate_id = (
                        easyship_rate.get('id') or
                        easyship_rate.get('easyship_rate_id') or
                        easyship_rate.get('rate_id') or
                        easyship_rate.get('courier_service', {}).get('id')  # Sometimes ID is in courier_service
                    )
                
                logger.info(f"Storing leg1_easyship with rate_id: {easyship_rate_id}, cost: {easyship_cost}")
                
                # Log if rate_id is missing
                if not easyship_rate_id:
                    logger.warning(f"WARNING: EasyShip rate has no ID! Rate keys: {list(easyship_rate.keys())}")
                    import json
                    logger.warning(f"Rate structure: {json.dumps(easyship_rate, indent=2, default=str)}")
                
                combined_quote = {
                    'transport_mode': route.transport_mode.code,
                    'transport_mode_name': route.transport_mode.name,
                    'route_id': route.id,
                    'carrier': route.carrier or 'Multiple Carriers',
                    'priority': route.priority,
                    'shipping_category': shipping_category,
                    'pickup_required': False,  # Drop-off, not pickup
                    'is_local_shipping': False,
                    'is_international_parcel': True,
                    'requires_drop_off': True,
                    'drop_off_instructions': self._get_drop_off_instructions(carrier_name),
                    
                    # Leg 1: Origin to Warehouse (EasyShip)
                    'leg1_easyship': {
                        'cost': easyship_cost,
                        'rate_id': easyship_rate_id,
                        'easyship_rate_id': easyship_rate_id,  # Explicit field for extraction
                        'easyship_rate_data': easyship_rate,  # Store full rate data for label generation
                        'carrier': carrier_name,
                        'service_name': service_name,
                        'courier_service': easyship_rate.get('courier_service', {}),  # Store courier service info
                        'transit_days': transit_days_to_warehouse,
                        'tracking_available': easyship_rate.get('tracking_rating', 0) > 0,
                    },
                    
                    # Leg 2: Warehouse to Destination (Route)
                    'leg2_route': {
                        'cost': route_quote['total'],
                        'transport_mode': route.transport_mode.name,
                        'transit_days': route_quote['transit_days'],
                        'base_rate': route_quote.get('base_rate', 0),
                        'breakdown': route_quote.get('breakdown', {}),
                    },
                    
                    # Combined totals
                    'total': combined_total,
                    'transit_days': combined_transit_days,
                    'transit_days_min': combined_transit_days[0],
                    'transit_days_max': combined_transit_days[1],
                    
                    # Breakdown showing both legs
                    'breakdown': {
                        'leg1_origin_to_warehouse': easyship_cost,
                        'leg2_warehouse_to_destination': route_quote['total'],
                        'total': combined_total,
                    },
                    
                    # Base rate for compatibility
                    'base_rate': route_quote.get('base_rate', 0),
                }
                
                quotes.append(combined_quote)
        
        # Sort by total cost
        quotes.sort(key=lambda x: x.get('total', 0))
        
        print(f"Generated {len(quotes)} combined international parcel quotes")
        return quotes
    
    def calculate_pickup_cost(self, origin_address, warehouse_address, weight, dimensions, shipping_category='small_parcel'):
        """Calculate cost from user address to warehouse using YuuSell's custom calculation"""
        print(f"Calculating pickup cost for shipping_category {shipping_category}, origin_address: {origin_address}, warehouse_address: {warehouse_address}")
        if not origin_address or not warehouse_address:
            print("No origin or warehouse address, returning 0.0")
            return 0.0
        return self.calculate_pickup_cost_custom(origin_address, warehouse_address, weight, dimensions, shipping_category)
    
    def calculate_easyship_to_warehouse(self, origin_country, weight, dimensions, origin_address=None, warehouse_address=None):
        """Get EasyShip quote to warehouse for non-pickup heavy items/cars"""
        try:
            # Check if EasyShip is configured
            if not self.easyship.is_configured:
                print("EasyShip not configured. Skipping warehouse rate calculation.")
                return None
            
            print(f"Calculating easyship to warehouse, origin_country: {origin_country}, weight: {weight}, dimensions: {dimensions}")
            
            # Use warehouse address if provided, otherwise get from database
            if not warehouse_address:
                warehouse_address = self.get_warehouse_address(origin_country)
                if not warehouse_address:
                    # Fallback to default US warehouse
                    warehouse_address = {
                        'country': 'US',
                        'city': 'Los Angeles',
                        'state_province': 'CA',
                        'postal_code': '90001',
                        'street_address': '1234 Warehouse St',
                        'full_name': 'YuuSell Logistics Warehouse',
                        'company': 'YuuSell Logistics',
                        'phone': '',
                        'email': 'warehouse@logistics.yuusell.com',
                    }
            
            # Use origin address if provided, otherwise use origin_country only
            rates = self.easyship.get_rates(
                origin_country,
                warehouse_address.get('country', 'US'),
                float(weight),
                dimensions,
                0,
                None,  # items
                origin_address,
                warehouse_address
            )
            if rates:
                rate_info = {
                    'cost': float(rates[0].get('total_charge', 0)),
                    'rate_id': rates[0].get('id'),
                    'carrier': rates[0].get('courier', {}).get('name', ''),
                    'service': rates[0].get('service', {}).get('name', '')
                }
                print(f"Easyship to warehouse rates found: {rate_info}")
                return rate_info
            print("No Easyship rates found.")
            return None
        except Exception as e:
            logger.error(f"Exception in calculate_easyship_to_warehouse: {str(e)}")
            print(f"Exception in calculate_easyship_to_warehouse: {str(e)}")
            return None
    
    def calculate_air_freight(self, route, weight, dimensions, declared_value=0, shipping_category='small_parcel'):
        """
        Air Freight: max(actual_weight, dimensional_weight) + fuel surcharge + security fees
        """
        logger.debug(f"Calculating air freight for route: {route}, weight: {weight}, dimensions: {dimensions}, declared_value: {declared_value}, category: {shipping_category}")
        actual_weight = Decimal(str(weight))
        calc_settings = self.get_calculation_settings(route, route.transport_mode, shipping_category)
        
        # Calculate dimensional weight
        dim_weight = self.calculate_dimensional_weight(
            dimensions.get('length', 10),
            dimensions.get('width', 10),
            dimensions.get('height', 10),
            float(calc_settings.dimensional_weight_divisor)
        )
        chargeable_weight = max(actual_weight, dim_weight)
        print(f"Chargeable air freight weight: {chargeable_weight}")
        
        # Get base rate and per kg rate from calculation settings
        base_rate_value = Decimal(str(calc_settings.base_rate)) if calc_settings.base_rate else Decimal('0')
        per_kg_rate_value = Decimal(str(calc_settings.per_kg_rate)) if calc_settings.per_kg_rate else Decimal('8.5')
        
        # Calculate base rate: base_rate + (chargeable_weight * per_kg_rate)
        base_rate = base_rate_value + (chargeable_weight * per_kg_rate_value)
        print(f"Air freight base rate: {base_rate} (base={base_rate_value}, per_kg={per_kg_rate_value}, weight={chargeable_weight})")
        
        # Get fuel surcharge and security fee from settings
        fuel_surcharge_percent = Decimal(str(calc_settings.fuel_surcharge_percent))
        security_fee = Decimal(str(calc_settings.security_fee))
        
        fuel_surcharge = base_rate * (fuel_surcharge_percent / Decimal('100'))
        
        total = base_rate + fuel_surcharge + security_fee
        
        # Apply markup
        markup = total * (Decimal(str(settings.SHIPPING_MARKUP_PERCENTAGE)) / Decimal('100'))
        print(f"Air freight pricing breakdown: base_rate={base_rate}, fuel_surcharge={fuel_surcharge}, security_fee={security_fee}, markup={markup}, total={total+markup}")
        
        return {
            'base_rate': float(base_rate),
            'fuel_surcharge': float(fuel_surcharge),
            'security_fee': float(security_fee),
            'markup': float(markup),
            'total': float(total + markup),
            'chargeable_weight': float(chargeable_weight),
            'actual_weight': float(actual_weight),
            'dimensional_weight': float(dim_weight),
            'transit_days': (1, 8),
            'breakdown': {
                'base_rate': float(base_rate),
                'fuel_surcharge': float(fuel_surcharge),
                'security_fee': float(security_fee),
                'markup': float(markup),
            }
        }
    
    def calculate_sea_freight(self, route, weight, dimensions, declared_value=0, shipping_category='small_parcel'):
        """
        Sea Freight: LCL or FCL based on volume
        LCL: max(volume_cbm × rate_per_cbm, weight_ton × rate_per_ton) + fees
        FCL: container price + fees
        """
        logger.debug(f"Calculating sea freight for route: {route}, weight: {weight}, dimensions: {dimensions}, declared_value: {declared_value}, category: {shipping_category}")
        weight_kg = Decimal(str(weight))
        # Convert dimensions from cm to meters
        length_m = Decimal(str(dimensions.get('length', 0))) / Decimal('100')
        width_m = Decimal(str(dimensions.get('width', 0))) / Decimal('100')
        height_m = Decimal(str(dimensions.get('height', 0))) / Decimal('100')
        
        volume_cbm = length_m * width_m * height_m
        weight_ton = weight_kg / Decimal('1000')
        logger.debug(f"Volume (cbm): {volume_cbm}, Weight (ton): {weight_ton}")
        
        calc_settings = self.get_calculation_settings(route, route.transport_mode, shipping_category)
        
        # Determine if FCL or LCL
        # Check if volume fits in containers
        container_20ft_cbm = Decimal(str(calc_settings.container_20ft_cbm))
        container_40ft_cbm = Decimal(str(calc_settings.container_40ft_cbm))
        
        is_fcl = False
        container_type = None
        
        if volume_cbm <= container_20ft_cbm:
            is_fcl = True
            container_type = '20ft'
            print("Fits in 20ft container.")
        elif volume_cbm <= container_40ft_cbm:
            is_fcl = True
            container_type = '40ft'
            print("Fits in 40ft container.")
        
        if is_fcl:
            # FCL pricing
            if container_type == '20ft':
                ocean_freight_base = Decimal(str(calc_settings.container_20ft_price))
            else:
                ocean_freight_base = Decimal(str(calc_settings.container_40ft_price))
            
            origin_fees = Decimal(str(calc_settings.container_origin_fees))
            destination_fees = Decimal(str(calc_settings.container_destination_fees))
            customs = Decimal(str(calc_settings.container_customs_fee))
            delivery = Decimal(str(calc_settings.container_delivery_fee))
            
            total = ocean_freight_base + origin_fees + destination_fees + customs + delivery
            
            # Apply markup
            markup = total * (Decimal(str(settings.SHIPPING_MARKUP_PERCENTAGE)) / Decimal('100'))
            print(f"FCL Pricing: base {ocean_freight_base}, origin {origin_fees}, dest {destination_fees}, customs {customs}, delivery {delivery}, markup {markup}, total {total + markup}")
            
            return {
                'base_rate': float(ocean_freight_base),
                'origin_fees': float(origin_fees),
                'destination_fees': float(destination_fees),
                'customs_fee': float(customs),
                'delivery_fee': float(delivery),
                'markup': float(markup),
                'total': float(total + markup),
                'volume_cbm': float(volume_cbm),
                'container_type': container_type,
                'is_fcl': True,
                'transit_days': (15, 45),
                'breakdown': {
                    'ocean_freight_base': float(ocean_freight_base),
                    'origin_fees': float(origin_fees),
                    'destination_fees': float(destination_fees),
                    'customs_fee': float(customs),
                    'delivery_fee': float(delivery),
                    'markup': float(markup),
                }
            }
        else:
            # LCL pricing
            rate_per_cbm = Decimal(str(calc_settings.rate_per_cbm))
            rate_per_ton = Decimal(str(calc_settings.rate_per_ton))
            
            cost_by_volume = volume_cbm * rate_per_cbm
            cost_by_weight = weight_ton * rate_per_ton
            print(f"LCL cost by volume: {cost_by_volume}, cost by weight: {cost_by_weight}")
            
            base_shipping = max(cost_by_volume, cost_by_weight)
            
            ocean_freight_base = Decimal(str(calc_settings.ocean_freight_base))
            port_origin_handling = Decimal(str(calc_settings.port_origin_handling))
            port_destination_handling = Decimal(str(calc_settings.port_destination_handling))
            documentation = Decimal(str(calc_settings.documentation_fee))
            customs_clearance = Decimal(str(calc_settings.customs_clearance_fee))
            destination_delivery = Decimal(str(calc_settings.destination_delivery_fee))
            
            total = (
                ocean_freight_base + 
                base_shipping + 
                port_origin_handling + 
                port_destination_handling + 
                documentation + 
                customs_clearance + 
                destination_delivery
            )
            
            # Apply markup
            markup = total * (Decimal(str(settings.SHIPPING_MARKUP_PERCENTAGE)) / Decimal('100'))
            print(f"LCL Pricing breakdown: total before markup {total}, markup {markup}, after {total + markup}")
            
            return {
                'base_rate': float(base_shipping),
                'ocean_freight_base': float(ocean_freight_base),
                'port_origin_handling': float(port_origin_handling),
                'port_destination_handling': float(port_destination_handling),
                'documentation_fee': float(documentation),
                'customs_clearance_fee': float(customs_clearance),
                'destination_delivery_fee': float(destination_delivery),
                'markup': float(markup),
                'total': float(total + markup),
                'volume_cbm': float(volume_cbm),
                'weight_ton': float(weight_ton),
                'cost_by_volume': float(cost_by_volume),
                'cost_by_weight': float(cost_by_weight),
                'is_fcl': False,
                'transit_days': (15, 45),
                'breakdown': {
                    'ocean_freight_base': float(ocean_freight_base),
                    'base_shipping': float(base_shipping),
                    'port_origin_handling': float(port_origin_handling),
                    'port_destination_handling': float(port_destination_handling),
                    'documentation_fee': float(documentation),
                    'customs_clearance_fee': float(customs_clearance),
                    'destination_delivery_fee': float(destination_delivery),
                    'markup': float(markup),
                }
            }
    
    def calculate_rail_freight(self, route, weight, dimensions, declared_value=0, shipping_category='small_parcel'):
        """Rail Freight: base route cost + per kg rate + terminal handling"""
        logger.debug(f"Calculating rail freight: route {route}, weight {weight}, dimensions {dimensions}, declared_value {declared_value}, category: {shipping_category}")
        weight_kg = Decimal(str(weight))
        
        # Get rail freight settings
        transport_mode = route.transport_mode if route else None
        calc_settings = self.get_calculation_settings(route, transport_mode, shipping_category) if route and transport_mode else None
        
        if calc_settings:
            base_route_cost = Decimal(str(calc_settings.base_rate_rail)) if calc_settings.base_rate_rail else Decimal('200')
            per_kg_rate = Decimal(str(calc_settings.per_kg_rate_rail)) if calc_settings.per_kg_rate_rail else Decimal('2.5')
            terminal_handling = Decimal(str(calc_settings.terminal_handling_fee)) if calc_settings.terminal_handling_fee else Decimal('100')
            customs_fee = Decimal(str(calc_settings.customs_fee_rail)) if calc_settings.customs_fee_rail else Decimal('50')
        else:
            # Fallback defaults
            base_route_cost = Decimal('200')
            per_kg_rate = Decimal('2.5')
            terminal_handling = Decimal('100')
            customs_fee = Decimal('50')
        
        base_rate = base_route_cost + (weight_kg * per_kg_rate)
        print(f"Rail freight base rate: {base_rate} (base={base_route_cost}, per_kg={per_kg_rate}, weight={weight_kg})")
        
        total = base_rate + terminal_handling + customs_fee
        
        # Apply markup
        markup = total * (Decimal(str(settings.SHIPPING_MARKUP_PERCENTAGE)) / Decimal('100'))
        print(f"Rail freight Pricing: base_rate={base_rate}, terminal_handling={terminal_handling}, customs_fee={customs_fee}, markup={markup}, total={total + markup}")
        
        return {
            'base_rate': float(base_rate),
            'terminal_handling': float(terminal_handling),
            'customs_fee': float(customs_fee),
            'markup': float(markup),
            'total': float(total + markup),
            'transit_days': (10, 20)
        }
    
    def calculate_truck_freight(self, route, weight, dimensions, declared_value=0, freight_class=70, shipping_category='small_parcel'):
        """
        Truck/Road: LTL uses freight class system, FTL by distance
        """
        logger.debug(f"Calculating truck freight: route {route}, weight {weight}, dimensions {dimensions}, declared_value {declared_value}, freight_class {freight_class}, category: {shipping_category}")
        weight_kg = Decimal(str(weight))
        weight_lbs = weight_kg * Decimal('2.20462')
        
        # Get truck freight settings
        transport_mode = TransportMode.objects.filter(type='truck').first()
        if not transport_mode:
            transport_mode = route.transport_mode if route else None
        
        calc_settings = self.get_calculation_settings(route, transport_mode, shipping_category) if route and transport_mode else None
        
        # Determine if LTL or FTL
        if weight_lbs < Decimal('10000'):  # Less than 10,000 lbs = LTL
            print("Truck LTL calculation.")
            # LTL: (weight/100) × base_rate × freight_class_multiplier
            base_rate_per_cwt = Decimal('50')  # $50 per 100 lbs (default)
            if calc_settings and calc_settings.base_rate_truck:
                base_rate_per_cwt = Decimal(str(calc_settings.base_rate_truck))
            
            cwt = weight_lbs / Decimal('100')
            
            # Freight class multiplier (50-500, lower = cheaper)
            class_multiplier = Decimal(str(freight_class)) / Decimal('100')
            
            base_rate = cwt * base_rate_per_cwt * class_multiplier
            fuel_surcharge = base_rate * Decimal('0.15')  # 15% fuel surcharge (default)
            if calc_settings and calc_settings.fuel_surcharge_percent:
                fuel_surcharge = base_rate * (Decimal(str(calc_settings.fuel_surcharge_percent)) / Decimal('100'))
            
            accessorials = Decimal('50')  # Standard accessorials (default)
            if calc_settings and calc_settings.handling_fee:
                accessorials = Decimal(str(calc_settings.handling_fee))
            
            total = base_rate + fuel_surcharge + accessorials
        else:
            print("Truck FTL calculation.")
            # FTL: Distance-based flat rate
            base_rate = Decimal('2000')  # Base FTL rate (default)
            if calc_settings and calc_settings.base_rate_truck:
                base_rate = Decimal(str(calc_settings.base_rate_truck)) * Decimal('40')  # Scale for FTL
            fuel_surcharge = base_rate * Decimal('0.20')  # 20% fuel surcharge (default)
            if calc_settings and calc_settings.fuel_surcharge_percent:
                fuel_surcharge = base_rate * (Decimal(str(calc_settings.fuel_surcharge_percent)) / Decimal('100'))
            accessorials = Decimal('0')
            total = base_rate + fuel_surcharge
        
        # Apply markup
        markup = total * (Decimal(str(settings.SHIPPING_MARKUP_PERCENTAGE)) / Decimal('100'))
        print(f"Truck freight pricing: base_rate={base_rate}, fuel_surcharge={fuel_surcharge}, accessorials={accessorials}, markup={markup}, total={total + markup}")
        
        return {
            'base_rate': float(base_rate),
            'fuel_surcharge': float(fuel_surcharge),
            'accessorials': float(accessorials),
            'markup': float(markup),
            'total': float(total + markup),
            'transit_days': (2, 10)
        }
    
    def get_local_shipping_quotes(self, origin_country, destination_country, weight, dimensions, declared_value=0, items=None, origin_address=None, destination_address=None):
        """Get EasyShip quotes for local shipping (skip warehouse) - returns all available rates with detailed information"""
        print(f"Getting EasyShip quotes for local shipping: {origin_country} to {destination_country}, weight: {weight}, dimensions: {dimensions}, declared_value: {declared_value}, items: {items}")
        easyship_rates = self.easyship.get_rates(
            origin_country, destination_country, weight, dimensions, declared_value, items, origin_address, destination_address
        )
        
        # If no rates found, return empty list (will be validated later)
        if not easyship_rates:
            logger.warning("No EasyShip rates found for local shipping")
            return []
        
        quotes = []
        for idx, rate in enumerate(easyship_rates):  # Return all rates
            print(f"EasyShip rate {idx+1}: {rate}")
            
            # Handle 2024-09 API response format
            courier_service = rate.get('courier_service', {})
            carrier_name = courier_service.get('name', rate.get('courier', {}).get('name', 'Unknown'))
            umbrella_name = courier_service.get('umbrella_name', '')
            service_name = courier_service.get('name', carrier_name)
            
            # Determine if this is a drop-off service based on available_handover_options
            available_handover = rate.get('available_handover_options', [])
            requires_drop_off = 'dropoff' in available_handover and 'free_pickup' not in available_handover
            
            # Also check carrier name for known drop-off carriers
            drop_off_carriers = ['USPS', 'United States Postal Service', 'FedEx Office', 'UPS Store', 'DHL Express ServicePoint', 'DHL eCommerce', 'HK Post', 'SF Express']
            if not requires_drop_off:
                requires_drop_off = any(drop_carrier.lower() in carrier_name.lower() for drop_carrier in drop_off_carriers)
            
            # Get transit days from new format
            transit_days_min = rate.get('min_delivery_time', rate.get('estimated_delivery_days_min', 1))
            transit_days_max = rate.get('max_delivery_time', rate.get('estimated_delivery_days_max', 3))
            
            # Get cost breakdown from new format
            total_charge = float(rate.get('total_charge', 0))
            shipment_charge = float(rate.get('shipment_charge', total_charge))
            insurance_fee = float(rate.get('insurance_fee', 0))
            fuel_surcharge = float(rate.get('fuel_surcharge', 0))
            other_surcharges = float(rate.get('additional_services_surcharge', 0))
            
            quote = {
                'transport_mode': 'local_courier',
                'transport_mode_name': f"{carrier_name} - {service_name}",
                'route_id': None,
                'carrier': carrier_name,
                'carrier_umbrella_name': umbrella_name,
                'carrier_id': courier_service.get('courier_id', ''),
                'service_name': service_name,
                'service_id': courier_service.get('id', ''),
                'priority': rate.get('cost_rank', 0),  # Use cost rank as priority
                'base_rate': shipment_charge,
                'total': total_charge,
                'markup': 0.0,
                'currency': rate.get('currency', 'USD'),
                'transit_days': (transit_days_min, transit_days_max),
                'transit_days_min': transit_days_min,
                'transit_days_max': transit_days_max,
                'delivery_time_rank': rate.get('delivery_time_rank', 0),
                'cost_rank': rate.get('cost_rank', 0),
                'value_for_money_rank': rate.get('value_for_money_rank', 0),
                'tracking_rating': rate.get('tracking_rating', 0),
                'easyship_rate_id': rate.get('id') or rate.get('easyship_rate_id') or rate.get('service_id') or '',
                'easyship_rate_data': rate,  # Include full rate data for frontend
                'is_local_shipping': True,
                'requires_drop_off': requires_drop_off,
                'available_handover_options': available_handover,
                'drop_off_instructions': self._get_drop_off_instructions(carrier_name) if requires_drop_off else None,
                'insurance_available': insurance_fee > 0 or rate.get('insurance_fee', 0) > 0,
                'tracking_available': rate.get('tracking_rating', 0) > 0,
                'carrier_logo_url': courier_service.get('logo', ''),
                'full_description': rate.get('full_description', f"{carrier_name} - {service_name}"),
                'description': rate.get('description', ''),
                'courier_remarks': rate.get('courier_remarks'),
                'incoterms': rate.get('incoterms', 'DDU'),
                'payment_recipient': rate.get('payment_recipient', 'Easyship'),
                'breakdown': {
                    'shipment_charge': shipment_charge,
                    'insurance_fee': insurance_fee,
                    'fuel_surcharge': fuel_surcharge,
                    'additional_services_surcharge': other_surcharges,
                    'estimated_import_duty': float(rate.get('estimated_import_duty', 0)),
                    'estimated_import_tax': float(rate.get('estimated_import_tax', 0)),
                    'total_charge': total_charge,
                }
            }
            quotes.append(quote)
        
        # Sort by price (lowest first) so users see cheapest options first
        quotes.sort(key=lambda x: x.get('total', 0))
        
        print(f"Total local shipping quotes: {len(quotes)}")
        return quotes
    
    def _get_drop_off_instructions(self, carrier_name):
        """Get drop-off instructions for specific carriers"""
        instructions = {
            'USPS': 'You will need to drop off your package at your local USPS Post Office or authorized USPS location. Bring a printed shipping label or use the QR code provided.',
            'United States Postal Service': 'You will need to drop off your package at your local USPS Post Office or authorized USPS location. Bring a printed shipping label or use the QR code provided.',
            'FedEx Office': 'You will need to drop off your package at a FedEx Office location. You can find the nearest location using the FedEx locator. Bring a printed shipping label.',
            'UPS Store': 'You will need to drop off your package at a UPS Store location. You can find the nearest location using the UPS locator. Bring a printed shipping label.',
            'DHL Express ServicePoint': 'You will need to drop off your package at a DHL ServicePoint location. You can find the nearest location using the DHL locator. Bring a printed shipping label.',
            'DHL eCommerce': 'You will need to drop off your package at a DHL ServicePoint location. You can find the nearest location using the DHL locator. Bring a printed shipping label.',
        }
        
        # Check for partial matches
        for key, value in instructions.items():
            if key.lower() in carrier_name.lower():
                return value
        
        return f'You will need to drop off your package at a {carrier_name} location. Please check with the carrier for the nearest drop-off location and bring a printed shipping label.'
    
    def get_all_quotes(self, origin_country, destination_country, weight, dimensions, 
                       declared_value=0, items=None, shipping_category='small_parcel', 
                       origin_address=None, warehouse_address=None, destination_address=None, 
                       skip_origin_to_warehouse=False):
        """
        Get quotes for all available transport modes based on shipping category
        
        Rules:
        - Local shipping: EasyShip quotes only (user buys label, direct delivery)
        - International parcels (< 100kg, not vehicles): Two-leg shipping
          * Leg 1: User drop-off → Warehouse (EasyShip) [SKIPPED if skip_origin_to_warehouse=True]
          * Leg 2: Warehouse → Destination (routes from DB)
        - Cars OR weight > 100kg: YuuSell handles with own calculation and local pickup only
        - Buy-and-ship (skip_origin_to_warehouse=True): Only Leg 2 (Warehouse → Destination)
          * Marketplace ships to warehouse, so no leg1 calculation needed
        - Otherwise: Standard calculation
        """
        print(f"Getting all quotes for origin: {origin_country}, destination: {destination_country}, weight: {weight}, dimensions: {dimensions}, declared_value: {declared_value}, shipping_category: {shipping_category}, origin_address: {origin_address}, warehouse_address: {warehouse_address}")
        # Check if local shipping - YuuSell just provides EasyShip quotes
        if self.is_local_shipping(origin_country, destination_country):
            print("Local shipping detected, using EasyShip quotes only.")
            # For local shipping, we need full addresses for EasyShip API
            local_quotes = self.get_local_shipping_quotes(
                origin_country, destination_country, weight, dimensions, declared_value, items, origin_address, destination_address
            )
            # If no EasyShip rates found, return empty list (frontend will handle validation)
            if not local_quotes:
                logger.warning("No EasyShip rates available for local shipping")
            return local_quotes
        
        # Check if this is an international parcel (not vehicle, < 100kg)
        is_international_parcel = (
            shipping_category in ['small_parcel', 'heavy_parcel'] and 
            weight <= 100 and 
            shipping_category != 'vehicle'
        )
        
        # Check if YuuSell handles (cars or >100kg) - use own calculation with local pickup only
        is_yuusell_handled = (shipping_category == 'vehicle' or weight > 100)
        print(f"is_yuusell_handled: {is_yuusell_handled}, is_international_parcel: {is_international_parcel}")
        
        # For international parcels, use two-leg shipping (EasyShip to warehouse + route from warehouse)
        # BUT skip if skip_origin_to_warehouse is True (e.g., for buy-and-ship where marketplace ships to warehouse)
        if is_international_parcel and warehouse_address and origin_address and not skip_origin_to_warehouse:
            print("International parcel detected, using two-leg shipping (EasyShip to warehouse + route from warehouse).")
            return self.get_international_parcel_quotes(
                origin_country, destination_country, weight, dimensions, declared_value, items,
                origin_address, warehouse_address, destination_address, shipping_category
            )
        
        # For buy-and-ship (skip_origin_to_warehouse=True), skip leg1 and only calculate warehouse to destination
        # Always use YuuSell's own route-based calculation (air, sea, rail, truck) - NO EasyShip
        if skip_origin_to_warehouse and warehouse_address:
            print("Buy-and-ship mode: Skipping origin-to-warehouse leg, calculating warehouse-to-destination using YuuSell routes only.")
            # Use warehouse country as origin for route calculation
            if isinstance(warehouse_address, dict):
                route_origin_country_code = warehouse_address.get('country', origin_country)
            else:
                route_origin_country_code = origin_country
        else:
            # For regular shipping, determine route origin country
            if is_yuusell_handled and warehouse_address:
                if isinstance(warehouse_address, dict):
                    route_origin_country_code = warehouse_address.get('country', origin_country)
                else:
                    route_origin_country_code = origin_country
            else:
                route_origin_country_code = origin_country
        
        # For big items (YuuSell-handled), validate pickup availability first
        # BUT skip validation for buy-and-ship (marketplace ships to warehouse, no pickup needed)
        if is_yuusell_handled and not skip_origin_to_warehouse:
            if not origin_address:
                logger.warning("Big items require origin address for pickup validation")
                return []
            
            pickup_available, pickup_settings = self.is_pickup_available(origin_address, shipping_category)
            if not pickup_available:
                logger.warning(f"Pickup not available for origin address in {origin_address.get('country', '')} / {origin_address.get('state_province', '')} for category {shipping_category}")
                return []  # Cannot deliver without pickup
        
        # Determine if pickup required
        # For buy-and-ship, no pickup needed (marketplace ships to warehouse)
        # For YuuSell-handled shipments, pickup is always required
        if skip_origin_to_warehouse:
            pickup_required = False  # No pickup needed for buy-and-ship
        else:
            pickup_required = True if is_yuusell_handled else self.determine_pickup_required(weight, shipping_category)
        print(f"pickup_required: {pickup_required}")
        
        # Get available routes with hierarchical matching
        if isinstance(route_origin_country_code, str):
            route_origin_country_obj = Country.objects.get(code=route_origin_country_code)
        else:
            route_origin_country_obj = route_origin_country_code
            
        if isinstance(destination_country, str):
            destination_country_obj = Country.objects.get(code=destination_country)
        else:
            destination_country_obj = destination_country
        
        # Get routes from warehouse country (or origin for non-big items) to destination
        routes = ShippingRoute.objects.filter(
            origin_country=route_origin_country_obj,
            destination_country=destination_country_obj,
            is_available=True
        ).select_related('transport_mode')
        
        print(f"Found {routes.count()} available routes from {route_origin_country_code} to {destination_country}.")
        
        # Filter routes that have ShippingCalculationSettings (required for pricing)
        valid_routes = []
        for route in routes:
            calc_settings = ShippingCalculationSettings.objects.filter(
                route=route,
                transport_mode=route.transport_mode
            ).first()
            
            if not calc_settings:
                # Try global default
                calc_settings = ShippingCalculationSettings.objects.filter(
                    transport_mode=route.transport_mode,
                    is_global_default=True
                ).first()
            
            if calc_settings:
                valid_routes.append(route)
            else:
                logger.warning(f"Route {route} has no ShippingCalculationSettings, skipping")
        
        if not valid_routes:
            logger.warning(f"No valid routes found with ShippingCalculationSettings for {route_origin_country_code} to {destination_country}")
            return []
        
        print(f"Found {len(valid_routes)} valid routes with calculation settings.")
        quotes = []
        
        # Filter transport modes based on category
        allowed_modes = []
        if shipping_category == 'small_parcel':
            allowed_modes = ['air']
        elif shipping_category == 'heavy_parcel':
            allowed_modes = ['air', 'sea']
        elif shipping_category in ['ltl_freight', 'ftl_freight']:
            allowed_modes = ['air', 'sea', 'rail', 'truck']
        elif shipping_category == 'vehicle':
            allowed_modes = ['sea']
        elif shipping_category == 'super_heavy':
            allowed_modes = ['sea']
        else:
            allowed_modes = ['air', 'sea', 'rail', 'truck']
        print(f"Allowed modes for category {shipping_category}: {allowed_modes}")
        
        for idx, route in enumerate(valid_routes):
            mode_type = route.transport_mode.type
            print(f"Evaluating route {idx+1}/{len(valid_routes)}: {route}, mode: {mode_type}")
            
            if mode_type not in allowed_modes:
                print(f"Mode {mode_type} not in allowed_modes, skipping.")
                continue
            
            if mode_type == 'air':
                logger.debug("Calculating air freight.")
                quote = self.calculate_air_freight(route, weight, dimensions, declared_value, shipping_category)
            elif mode_type == 'sea':
                logger.debug("Calculating sea freight.")
                quote = self.calculate_sea_freight(route, weight, dimensions, declared_value, shipping_category)
            elif mode_type == 'rail':
                logger.debug("Calculating rail freight.")
                quote = self.calculate_rail_freight(route, weight, dimensions, declared_value, shipping_category)
            elif mode_type == 'truck':
                logger.debug("Calculating truck freight.")
                freight_class = 70  # Default
                if shipping_category == 'ltl_freight':
                    freight_class = 70
                quote = self.calculate_truck_freight(route, weight, dimensions, declared_value, freight_class, shipping_category)
            else:
                print(f"Unknown mode type {mode_type}, skipping.")
                continue
            
            # For buy-and-ship (skip_origin_to_warehouse=True), no pickup or EasyShip costs needed
            # Marketplace ships directly to warehouse, so we only charge warehouse-to-destination shipping
            if skip_origin_to_warehouse:
                print("Buy-and-ship: No pickup or origin-to-warehouse costs (marketplace ships to warehouse).")
                quote['pickup_cost'] = 0.0
                quote['pickup_required'] = False
                quote['is_buy_and_ship'] = True
            # For YuuSell-handled shipments (cars or >100kg), always require local pickup
            # and use YuuSell's own calculation method (already calculated above)
            elif is_yuusell_handled:
                print("YuuSell handled: Adding pickup cost.")
                # Add pickup cost (required for YuuSell-handled shipments)
                pickup_cost = 0.0
                if origin_address and warehouse_address:
                    pickup_cost = self.calculate_pickup_cost(origin_address, warehouse_address, weight, dimensions, shipping_category)
                    print(f"Pickup cost: {pickup_cost}")
                    quote['pickup_cost'] = pickup_cost
                    quote['total'] = quote['total'] + pickup_cost
                quote['is_yuusell_handled'] = True
                quote['pickup_required'] = True
            else:
                # Standard handling: Add pickup cost if required
                pickup_cost = 0.0
                if pickup_required and origin_address and warehouse_address:
                    print("Standard handling: Adding pickup cost.")
                    pickup_cost = self.calculate_pickup_cost(origin_address, warehouse_address, weight, dimensions, shipping_category)
                    print(f"Pickup cost: {pickup_cost}")
                    quote['pickup_cost'] = pickup_cost
                    quote['total'] = quote['total'] + pickup_cost
                
                # Add EasyShip to warehouse cost for non-pickup heavy items
                # BUT skip if skip_origin_to_warehouse is True (buy-and-ship: marketplace ships to warehouse)
                easyship_to_warehouse_cost = 0.0
                if not pickup_required and not skip_origin_to_warehouse:
                    if origin_country:
                        print("Heavy or super heavy without pickup: Getting Easyship to warehouse cost.")
                        easyship_result = self.calculate_easyship_to_warehouse(
                            origin_country, weight, dimensions, origin_address, warehouse_address
                        )
                        if easyship_result:
                            easyship_to_warehouse_cost = easyship_result['cost']
                            print("Easyship to warehouse", easyship_to_warehouse_cost)
                            quote['easyship_to_warehouse'] = easyship_result
                            quote['total'] = quote['total'] + easyship_to_warehouse_cost
            
            quote.update({
                'transport_mode': route.transport_mode.code,
                'transport_mode_name': route.transport_mode.name,
                'route_id': route.id,
                'carrier': route.carrier or 'Multiple Carriers',
                'priority': route.priority,
                'shipping_category': shipping_category,
                'pickup_required': pickup_required,
            })
            print(f"Appended quote: {quote}")
            quotes.append(quote)
        
        # Sort by priority, then by total cost
        print("Sorting quotes by priority and total cost.")
        quotes.sort(key=lambda x: (-x.get('priority', 0), x.get('total', 0)))
        
        print(f"Returning {len(quotes)} quotes.")
        return quotes
