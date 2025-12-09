"""
EasyShip API Integration Service
"""
import requests
import json
from django.conf import settings
from django.core.cache import cache
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class EasyShipService:
    """Service for interacting with EasyShip API"""
    
    BASE_URL = settings.EASYSHIP_API_URL
    API_KEY = settings.EASYSHIP_API_KEY
    
    def __init__(self):
        self.headers = {
            'Authorization': f'Bearer {self.API_KEY}',
            'Content-Type': 'application/json'
        }
        self.is_configured = bool(self.API_KEY and self.BASE_URL)
    
    def get_rates(self, origin_country, destination_country, weight, dimensions, 
                  declared_value=0, items=None, origin_address=None, destination_address=None):
        """
        Get shipping rates from EasyShip
        
        Args:
            origin_country: ISO country code (e.g., 'US') or full address dict
            destination_country: ISO country code (e.g., 'GB') or full address dict
            weight: Weight in kg
            dimensions: Dict with length, width, height in cm
            declared_value: Declared value in USD
            items: List of items (optional)
            origin_address: Full origin address dict (required for 2024-09 API)
            destination_address: Full destination address dict (required for 2024-09 API)
        
        Returns:
            List of rate options
        """
        # Check if EasyShip is configured
        if not self.is_configured:
            logger.warning("EasyShip API not configured. Skipping rate request.")
            return []
        
        cache_key = f"easyship_rates_{origin_country}_{destination_country}_{weight}_{dimensions.get('length', 0)}_{dimensions.get('width', 0)}_{dimensions.get('height', 0)}"
        
        # Check cache (5 minutes)
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            # Determine API version based on BASE_URL
            if "2024-09" in self.BASE_URL or "public-api" in self.BASE_URL:
                # Use 2024-09 API format
                if "/2024-09" in self.BASE_URL:
                    url = f"{self.BASE_URL}/rates"
                else:
                    url = f"{self.BASE_URL}/2024-09/rates"
                
                # Build origin address - use full address if provided, otherwise use country only
                if origin_address and isinstance(origin_address, dict):
                    # Ensure required fields are not empty strings
                    postal_code = origin_address.get('postal_code', '').strip() or None
                    city = origin_address.get('city', '').strip() or ''
                    state = origin_address.get('state_province', '').strip() or ''
                    
                    origin_addr = {
                        "line_1": origin_address.get('street_address', '').strip() or '',
                        "line_2": (origin_address.get('street_address_2', '') or '').strip() or None,
                        "state": state,
                        "city": city,
                        "postal_code": postal_code,
                        "country_alpha2": origin_address.get('country', origin_country),
                        "contact_name": origin_address.get('full_name', 'YuuSell Logistics').strip() or 'YuuSell Logistics',
                        "company_name": (origin_address.get('company', '') or '').strip() or None,
                        "contact_email": origin_address.get('email', 'noreply@logistics.yuusell.com').strip() or 'noreply@logistics.yuusell.com',
                    }
                    # Ensure contact_phone is not blank (EasyShip requirement)
                    origin_phone_rate = origin_address.get('phone', '').strip()
                    if not origin_phone_rate:
                        origin_phone_rate = '+1234567890'
                    origin_addr["contact_phone"] = origin_phone_rate
                else:
                    # Fallback to country only (may cause 422 error if API requires full address)
                    origin_addr = {
                        "line_1": "",
                        "line_2": None,
                        "state": "",
                        "city": "",
                        "postal_code": None,
                        "country_alpha2": origin_country if isinstance(origin_country, str) else origin_country,
                        "contact_name": "YuuSell Logistics",
                        "company_name": None,
                        "contact_phone": "+1234567890",  # Default phone for rate requests when address not provided
                        "contact_email": "noreply@logistics.yuusell.com",
                    }
                
                # Build destination address
                if destination_address and isinstance(destination_address, dict):
                    # Ensure required fields are not empty strings
                    dest_postal_code = destination_address.get('postal_code', '').strip() or None
                    dest_city = destination_address.get('city', '').strip() or ''
                    dest_state = destination_address.get('state_province', '').strip() or ''
                    
                    # Ensure contact_phone is not blank (EasyShip requirement)
                    dest_phone_rate = destination_address.get('phone', '').strip()
                    if not dest_phone_rate:
                        dest_phone_rate = '+1234567890'
                    
                    dest_addr = {
                        "line_1": destination_address.get('street_address', '').strip() or '',
                        "line_2": (destination_address.get('street_address_2', '') or '').strip() or None,
                        "state": dest_state,
                        "city": dest_city,
                        "postal_code": dest_postal_code,
                        "country_alpha2": destination_address.get('country', destination_country),
                        "contact_name": destination_address.get('full_name', 'Recipient').strip() or 'Recipient',
                        "company_name": (destination_address.get('company', '') or '').strip() or None,
                        "contact_phone": dest_phone_rate,  # Use validated phone with default
                        "contact_email": destination_address.get('email', '').strip() or 'recipient@logistics.yuusell.com',
                    }
                else:
                    dest_addr = {
                        "line_1": "",
                        "line_2": None,
                        "state": "",
                        "city": "",
                        "postal_code": None,
                        "country_alpha2": destination_country if isinstance(destination_country, str) else destination_country,
                        "contact_name": "Recipient",
                        "company_name": None,
                        "contact_phone": "+1234567890",  # Default phone for rate requests when address not provided
                        "contact_email": "recipient@logistics.yuusell.com",
                    }
                
                # Build items array according to 2024-09 API format
                if items and isinstance(items, list) and len(items) > 0:
                    parcel_items = []
                    for item in items:
                        # Convert old format to new format if needed
                        if 'declared_customs_value' in item or 'declared_currency' in item:
                            # Already in new format, but ensure declared_customs_value > 0
                            item_copy = item.copy()
                            if 'declared_customs_value' in item_copy:
                                item_value = float(item_copy.get('declared_customs_value', 0))
                                if item_value <= 0:
                                    item_value = 1.0
                                item_copy['declared_customs_value'] = float(item_value)
                            parcel_items.append(item_copy)
                        else:
                            # Convert old format to new format
                            item_weight = item.get('weight', weight / max(len(items), 1))
                            item_dimensions = item.get('dimensions', dimensions)
                            # Ensure declared_customs_value is greater than 0
                            item_value = item.get('declared_customs_value', item.get('value', declared_value))
                            if item_value <= 0:
                                item_value = 1.0  # Minimum value required by EasyShip
                            
                            parcel_items.append({
                                "description": item.get('description', 'General Merchandise'),
                                "category": item.get('category', 'general'),
                                "hs_code": item.get('hs_code', '999999'),  # Required: HS code for customs
                                "sku": item.get('sku', 'GEN'),
                                "origin_country_alpha2": item.get('origin_country_alpha2', origin_country if isinstance(origin_country, str) else origin_country),
                                "quantity": item.get('quantity', 1),
                                "dimensions": {
                                    "length": item_dimensions.get('length', dimensions.get('length', 10)),
                                    "width": item_dimensions.get('width', dimensions.get('width', 10)),
                                    "height": item_dimensions.get('height', dimensions.get('height', 10)),
                                },
                                "actual_weight": item_weight,
                                "declared_currency": item.get('declared_currency', 'USD'),
                                "declared_customs_value": float(item_value),
                            })
                else:
                    # Default item if none provided
                    # Ensure declared_customs_value is greater than 0
                    default_value = declared_value if declared_value > 0 else 1.0
                    
                    parcel_items = [{
                        "description": "General Merchandise",
                        "category": "general",
                        "hs_code": "999999",  # Required: HS code for general merchandise
                        "sku": "GEN",
                        "origin_country_alpha2": origin_country if isinstance(origin_country, str) else origin_country,
                        "quantity": 1,
                        "dimensions": {
                            "length": dimensions.get('length', 10),
                            "width": dimensions.get('width', 10),
                            "height": dimensions.get('height', 10),
                        },
                        "actual_weight": weight,
                        "declared_currency": "USD",
                        "declared_customs_value": float(default_value),
                    }]
                
                parcel_data = {
                    "total_actual_weight": weight,
                    "box": None,  # Use items dimensions instead
                    "items": parcel_items  # Items array is required
                }
                
                payload = {
                    "origin_address": origin_addr,
                    "destination_address": dest_addr,
                    "parcels": [parcel_data]
                }
                
                logger.info(f"EasyShip 2024-09 API request to {url} with payload: {payload}")
                
                response = requests.post(url, headers=self.headers, json=payload, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                # Handle 2024-09 API response format
                rates = data.get('rates', [])
                # Log rate structure to debug rate ID extraction
                if rates:
                    logger.info(f"EasyShip 2024-09 API returned {len(rates)} rates")
                    logger.info(f"First rate keys: {list(rates[0].keys()) if isinstance(rates[0], dict) else 'Not a dict'}")
                    logger.info(f"First rate ID: {rates[0].get('id') if isinstance(rates[0], dict) else 'N/A'}")
            else:
                # Use older API format (rate/v1/rates)
                url = f"{self.BASE_URL}/rate/v1/rates"
                payload = {
                    "platform_name": "logistics.yuusell.com",
                    "origin_address": {
                        "country_alpha2": origin_country,
                    },
                    "destination_address": {
                        "country_alpha2": destination_country,
                    },
                    "parcels": [{
                        "total_actual_weight": weight,
                        "box": {
                            "length": dimensions.get('length', 10),
                            "width": dimensions.get('width', 10),
                            "height": dimensions.get('height', 10),
                        },
                        "items": items or [{
                            "description": "General Merchandise",
                            "hs_code": "999999",
                            "sku": "GEN",
                            "quantity": 1,
                            "value": declared_value,
                            "currency": "USD"
                        }]
                    }]
                }
                logger.info(f"EasyShip legacy API request to {url}")
                
                response = requests.post(url, headers=self.headers, json=payload, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                # Fallback for older API format
                rates = data if isinstance(data, list) else []
            
            # Cache for 5 minutes
            cache.set(cache_key, rates, 300)
            
            # Store in database for history
            from logistics.models import EasyShipRate
            for rate in rates:
                EasyShipRate.objects.create(
                    origin_country=origin_country,
                    destination_country=destination_country,
                    weight=weight,
                    dimensions=dimensions,
                    carrier=rate.get('courier', {}).get('name', ''),
                    service_name=rate.get('service', {}).get('name', ''),
                    rate=Decimal(str(rate.get('total_charge', 0))),
                    currency=rate.get('currency', 'USD'),
                    transit_days=rate.get('estimated_delivery_days'),
                    rate_data=rate,
                    expires_at=datetime.now() + timedelta(minutes=5)
                )
            
            return rates
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                logger.error(f"EasyShip API 403 Forbidden - Check API key configuration and permissions. Error: {str(e)}")
            elif e.response.status_code == 401:
                logger.error(f"EasyShip API 401 Unauthorized - Invalid API key. Error: {str(e)}")
            elif e.response.status_code == 422:
                # Log the response body for debugging
                try:
                    error_data = e.response.json()
                    logger.error(f"EasyShip API 422 Unprocessable Entity - Invalid request format. Error details: {error_data}")
                except:
                    logger.error(f"EasyShip API 422 Unprocessable Entity - Invalid request format. Response: {e.response.text}")
            else:
                logger.error(f"EasyShip API HTTP error ({e.response.status_code}): {str(e)}")
            return []
        except requests.exceptions.RequestException as e:
            logger.error(f"EasyShip API request error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error getting EasyShip rates: {str(e)}")
            return []
    











    def create_shipment(self, rate_id, origin_address, destination_address, parcels, courier_name=None, package_reference_number=None):
        """
        Create shipment and generate label
        
        Args:
            rate_id: EasyShip rate ID (optional for 2024-09 API - can create shipment first then buy label)
            origin_address: Dict with address fields (country_alpha2 format)
            destination_address: Dict with address fields (country_alpha2 format)
            parcels: List of parcel objects
            courier_name: Optional courier name from selected quote
            package_reference_number: Optional package reference number to use as contact_name
        
        Returns:
            Dict with shipment_id, easyship_shipment_id, label_url, and tracking_number
        """
        try:
            print("BASE UR:", self.BASE_URL)
            # Determine API version based on BASE_URL
            if "2024-09" in self.BASE_URL or "public-api" in self.BASE_URL:
                # Use 2024-09 API format
                if "/2024-09" in self.BASE_URL:
                    url = f"{self.BASE_URL}/shipments"
                else:
                    url = f"{self.BASE_URL}/2024-09/shipments"
            else:
                # Legacy API format
                url = f"{self.BASE_URL}/shipment/v1/shipments"
            
            # Determine if using 2024-09 API format
            is_2024_09_api = True
            print("IS 2024-09 API:", is_2024_09_api)
            print("Url", url)
            if is_2024_09_api:
                # Use 2024-09 API format
                origin_postal_code = origin_address.get('postal_code', '').strip() or None
                origin_city = origin_address.get('city', '').strip() or ''
                origin_state = origin_address.get('state_province', '').strip() or ''
                
                # Ensure contact_phone is not blank (EasyShip requirement)
                origin_phone = origin_address.get('phone', '').strip()
                if not origin_phone:
                    # Use default phone when phone is missing
                    origin_phone = '+1234567890'
                    logger.warning(f"Origin address missing phone number, using default: {origin_phone}")
                
                # Use package reference number as contact_name if provided, otherwise use full_name
                contact_name = package_reference_number if package_reference_number else origin_address.get('full_name', 'YuuSell Logistics').strip() or 'YuuSell Logistics'
                
                origin_formatted = {
                    "line_1": origin_address.get('street_address', '').strip() or '',
                    "line_2": (origin_address.get('street_address_2', '') or '').strip() or None,
                    "state": origin_state,
                    "city": origin_city,
                    "postal_code": origin_postal_code,
                    "country_alpha2": origin_address.get('country_alpha2') or origin_address.get('country', 'US'),
                    "contact_name": contact_name,
                    "company_name": (origin_address.get('company', '') or '').strip() or "YuuSell Logistics",
                    "contact_phone": origin_phone,  # Use validated phone with default
                    "contact_email": origin_address.get('email', 'noreply@logistics.yuusell.com').strip() or 'noreply@logistics.yuusell.com',
                }
                
                dest_postal_code = destination_address.get('postal_code', '').strip() or None
                dest_city = destination_address.get('city', '').strip() or ''
                dest_state = destination_address.get('state_province', '').strip() or ''
                
                # Ensure contact_phone is not blank (EasyShip requirement)
                dest_phone = destination_address.get('phone', '').strip()
                if not dest_phone:
                    # Use default phone for warehouse addresses or when phone is missing
                    dest_phone = '+1234567890'
                    logger.warning(f"Destination address missing phone number, using default: {dest_phone}")
                
                destination_formatted = {
                    "line_1": destination_address.get('street_address', '').strip() or '',
                    "line_2": (destination_address.get('street_address_2', '') or '').strip() or None,
                    "state": dest_state,
                    "city": dest_city,
                    "postal_code": dest_postal_code,
                    "country_alpha2": destination_address.get('country_alpha2') or destination_address.get('country', 'US'),
                    "contact_name": destination_address.get('full_name', 'Recipient').strip() or 'Recipient',
                    "company_name": (destination_address.get('company', '') or '').strip() or "YuuSell Logistics",
                    "contact_phone": dest_phone,  # Use validated phone with default
                    "contact_email": destination_address.get('email', 'recipient@logistics.yuusell.com').strip() or 'recipient@logistics.yuusell.com',
                }
                
                # Format parcels according to 2024-09 API
                formatted_parcels = []
                for parcel in parcels:
                    formatted_parcel = {
                        "box": parcel.get('box') if parcel.get('box') else None,
                        "total_actual_weight": parcel.get('total_actual_weight', 0),
                        "items": []
                    }
                    
                    # Format items
                    items = parcel.get('items', [])
                    for item in items:
                        formatted_item = {
                            "quantity": item.get('quantity', 1),
                            "dimensions": item.get('dimensions', {}),
                            "description": item.get('description', 'General Merchandise'),
                            "category": item.get('category'),
                            "hs_code": item.get('hs_code', '64035900'),
                            "contains_battery_pi966": item.get('contains_battery_pi966', False),
                            "contains_battery_pi967": item.get('contains_battery_pi967', False),
                            "contains_liquids": item.get('contains_liquids', False),
                            "sku": item.get('sku', 'GEN'),
                            "origin_country_alpha2": item.get('origin_country_alpha2') or origin_formatted.get('country_alpha2', 'US'),
                            "actual_weight": item.get('actual_weight', parcel.get('total_actual_weight', 0)),
                            "declared_currency": item.get('declared_currency', 'USD'),
                            "declared_customs_value": max(float(item.get('declared_customs_value', item.get('value', 0))), 1.0)
                        }
                        formatted_parcel["items"].append(formatted_item)
                    
                    formatted_parcels.append(formatted_parcel)
                
                # Build order_data with optional courier name
                order_data = {
                    "platform_name": "logistics yuusell",
                    "order_created_at": datetime.now().isoformat() + 'Z'
                }
                if courier_name:
                    order_data["buyer_selected_courier_name"] = courier_name
                
                payload = {
                    "origin_address": origin_formatted,
                    "destination_address": destination_formatted,
                    "incoterms": "DDU",
                    "insurance": {
                        "is_insured": False
                    },
                    "order_data": order_data,
                    "courier_settings": {
                        "allow_fallback": True,
                        "apply_shipping_rules": True
                    },
                    "shipping_settings": {
                        "additional_services": {
                            "qr_code": "none"
                        },
                        "units": {
                            "weight": "kg",
                            "dimensions": "cm"
                        },
                        "buy_label": False,
                        "buy_label_synchronous": False,
                        "printing_options": {
                            "format": "png",
                            "label": "4x6",
                            "commercial_invoice": "A4",
                            "packing_slip": "4x6"
                        }
                    },
                    "parcels": formatted_parcels
                }
                
                # Add rate selection if provided - always buy label when rate_id is provided
                if rate_id:
                    # payload["rate"] = {
                    #     "easyship_rate_id": rate_id
                    # }
                    payload["shipping_settings"]["buy_label"] = True
                    payload["shipping_settings"]["buy_label_synchronous"] = True
            else:
                # Legacy API format
                origin_formatted = {
                "country_alpha2": origin_address.get('country_alpha2') or origin_address.get('country', 'US'),
                "postal_code": origin_address.get('postal_code', ''),
                "state": origin_address.get('state_province', ''),
                "city": origin_address.get('city', ''),
                "line_1": origin_address.get('street_address', ''),
                "line_2": origin_address.get('street_address_2', ''),
                "contact_name": origin_address.get('full_name', ''),
                "company_name": (origin_address.get('company', '') or '').strip() or "YuuSell Logistics",
                "contact_phone": origin_address.get('phone', ''),
                 "contact_email": origin_address.get('email', 'noreply@logistics.yuusell.com').strip() or 'noreply@logistics.yuusell.com',
            }
            
            destination_formatted = {
                "country_alpha2": destination_address.get('country_alpha2') or destination_address.get('country', 'US'),
                "postal_code": destination_address.get('postal_code', ''),
                "state": destination_address.get('state_province', ''),
                "city": destination_address.get('city', ''),
                "line_1": destination_address.get('street_address', ''),
                "line_2": destination_address.get('street_address_2', ''),
                "contact_name": destination_address.get('full_name', ''),
                "contact_phone": destination_address.get('phone', ''),
                "company_name": (destination_address.get('company', '') or '').strip() or "YuuSell Logistics",
                "contact_email": destination_address.get('email', 'recipient@logistics.yuusell.com').strip() or 'recipient@logistics.yuusell.com',
            }
            
            payload = {
                # "platform_name": "logistics yuusell",
                # "rate": {
                #     "easyship_rate_id": rate_id
                # },
                "origin_address": origin_formatted,
                "destination_address": destination_formatted,
                "parcels": parcels
            }
            
            # Log the request payload for debugging
            logger.info(f"EasyShip create shipment request to {url}")
            logger.info(f"Request payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Log the full response for debugging
            logger.info(f"EasyShip create shipment full response: {json.dumps(data, indent=2)}")
            print(f"\n{'='*80}")
            print("EASYSHIP CREATE SHIPMENT FULL RESPONSE:")
            print(f"{'='*80}")
            print(json.dumps(data, indent=2))
            print(f"{'='*80}\n")
            
            shipment = data.get('shipment', {})
            
            # Extract tracking number from trackings array if available
            trackings = shipment.get('trackings', [])
            tracking_number = trackings[0].get('tracking_number', '') if trackings else shipment.get('tracking_number', '')
            
            # Get label URL from shipping_documents if available
            shipping_documents = shipment.get('shipping_documents', [])
            label_url = ''
            if shipping_documents:
                for doc in shipping_documents:
                    if doc.get('type') == 'label':
                        label_url = doc.get('url', '')
                        break
            
            return {
                'shipment_id': shipment.get('id'),
                'easyship_shipment_id': shipment.get('easyship_shipment_id', ''),
                'label_url': label_url,
                'tracking_number': tracking_number,
                'tracking_page_url': shipment.get('tracking_page_url', '')
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"EasyShip create shipment error: {e.response.status_code} {e.response.reason}"
            try:
                error_data = e.response.json()
                error_details = error_data.get('error', {})
                if isinstance(error_details, dict):
                    details = error_details.get('details', [])
                    if details:
                        error_msg += f" - Details: {', '.join(details)}"
                    else:
                        error_msg += f" - Message: {error_details.get('message', str(error_data))}"
                else:
                    error_msg += f" - {error_data}"
            except:
                error_msg += f" - Response: {e.response.text[:500]}"
            logger.error(error_msg)
            logger.error(f"Request payload: {json.dumps(payload, indent=2)}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"EasyShip create shipment error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error creating EasyShip shipment: {str(e)}")
            logger.exception(e)
            return None
    
    def get_tracking(self, tracking_number):
        """Get tracking information"""
        try:
            url = f"{self.BASE_URL}/track/v1/status"
            params = {'tracking_number': tracking_number}
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"EasyShip tracking error: {str(e)}")
            return None
    
    def validate_address(self, address_data, replace_with_validation_result=True):
        """
        Validate address using EasyShip API
        
        Args:
            address_data: Dict with address fields:
                - company_name (optional)
                - line_1: Street address
                - city: City
                - postal_code: Postal/ZIP code
                - country_alpha2: ISO country code (e.g., 'US', 'GB')
                - state (optional): State/Province
            replace_with_validation_result: If True, return validated address; if False, return validation status only
        
        Returns:
            Dict with validation result and validated address (if replace_with_validation_result=True)
        """
        if not self.is_configured:
            logger.warning("EasyShip API not configured. Skipping address validation.")
            return None
        
        try:
            # Determine API version
            if "/2024-09" in self.BASE_URL or "public-api" in self.BASE_URL:
                if "/2024-09" in self.BASE_URL:
                    url = f"{self.BASE_URL}/addresses/validations"
                else:
                    url = f"{self.BASE_URL}/2024-09/addresses/validations"
            else:
                # Legacy API might not support validation
                logger.warning("Address validation not available for legacy API")
                return None
            
            # Build payload according to EasyShip API format
            payload = {
                "line_1": address_data.get('street_address', address_data.get('line_1', '')).strip(),
                "city": address_data.get('city', '').strip(),
                "postal_code": address_data.get('postal_code', '').strip(),
                "country_alpha2": address_data.get('country', address_data.get('country_alpha2', '')).strip(),
                "replace_with_validation_result": replace_with_validation_result
            }
            
            # Add optional fields
            if address_data.get('company_name') or address_data.get('company'):
                payload["company_name"] = (address_data.get('company_name') or address_data.get('company', '')).strip()
            
            if address_data.get('state') or address_data.get('state_province'):
                payload["state"] = (address_data.get('state') or address_data.get('state_province', '')).strip()
            
            if address_data.get('line_2') or address_data.get('street_address_2'):
                payload["line_2"] = (address_data.get('line_2') or address_data.get('street_address_2', '')).strip()
            
            logger.info(f"EasyShip address validation request to {url} with payload: {payload}")
            
            # Use different headers for validation endpoint
            validation_headers = {
                'accept': 'application/json',
                'content-type': 'application/json',
                'Authorization': f'Bearer {self.API_KEY}'
            }
            
            response = requests.post(url, headers=validation_headers, json=payload, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"EasyShip address validation response: {data}")
            
            return data
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 422:
                try:
                    error_data = e.response.json()
                    logger.error(f"EasyShip address validation 422 error: {error_data}")
                except:
                    logger.error(f"EasyShip address validation 422 error: {e.response.text}")
            else:
                logger.error(f"EasyShip address validation HTTP error ({e.response.status_code}): {str(e)}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"EasyShip address validation request error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error validating address with EasyShip: {str(e)}")
            return None

