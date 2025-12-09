"""
Management command to prepopulate database with sample data for all models
This makes the website look like it's running with real data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal
import random
from datetime import timedelta

# Import all models
from accounts.models import User, UserPreference
from buying.models import BuyingRequest, BuyAndShipQuote
from logistics.models import (
    Country, TransportMode, ShippingRoute, Package, LogisticsShipment,
    ShippingCalculationSettings, QuoteRequest, TrackingUpdate, PickupRequest,
    Warehouse, PickupCalculationSettings, EasyShipRate
)
from payments.models import Payment
from vehicles.models import Vehicle, VehicleDocument
from warehouse.models import WarehouseReceiving, WarehouseLabel, PickupSchedule

User = get_user_model()


class Command(BaseCommand):
    help = 'Prepopulate database with sample data for all models to make website look active'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            # Don't delete users, but clear other data
            Package.objects.all().delete()
            LogisticsShipment.objects.all().delete()
            BuyingRequest.objects.all().delete()
            BuyAndShipQuote.objects.all().delete()
            Vehicle.objects.all().delete()
            Payment.objects.all().delete()
            TrackingUpdate.objects.all().delete()
            PickupRequest.objects.all().delete()
            QuoteRequest.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Starting database prepopulation...'))
        
        # Step 1: Ensure base data exists
        self.create_base_data()
        
        # Step 2: Create users
        users = self.create_users()
        
        # Step 3: Create user addresses and preferences
        self.create_user_data(users)
        
        # Step 4: Create buying requests and quotes
        self.create_buying_data(users)
        
        # Step 5: Create shipments and packages
        self.create_shipping_data(users)
        
        # Step 6: Create vehicles and vehicle documents
        self.create_vehicles(users)
        self.create_vehicle_documents()
        
        # Step 7: Create payments
        self.create_payments(users)
        
        # Step 8: Create tracking updates
        self.create_tracking_updates()
        
        # Step 9: Create warehouse records
        self.create_warehouse_data(users)
        
        self.stdout.write(self.style.SUCCESS('\n✓ Successfully prepopulated database with sample data!'))

    def create_base_data(self):
        """Create countries, transport modes, routes, warehouses, and settings"""
        self.stdout.write('Creating base data...')
        
        # Countries
        countries_data = [
            {'code': 'US', 'name': 'United States', 'continent': 'North America'},
            {'code': 'GB', 'name': 'United Kingdom', 'continent': 'Europe'},
            {'code': 'CA', 'name': 'Canada', 'continent': 'North America'},
            {'code': 'DE', 'name': 'Germany', 'continent': 'Europe'},
            {'code': 'FR', 'name': 'France', 'continent': 'Europe'},
            {'code': 'CN', 'name': 'China', 'continent': 'Asia'},
            {'code': 'JP', 'name': 'Japan', 'continent': 'Asia'},
            {'code': 'AU', 'name': 'Australia', 'continent': 'Oceania'},
            {'code': 'IN', 'name': 'India', 'continent': 'Asia'},
            {'code': 'BR', 'name': 'Brazil', 'continent': 'South America'},
        ]
        
        countries = {}
        for data in countries_data:
            country, created = Country.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            countries[data['code']] = country
        
        # Transport modes
        modes_data = [
            {'code': 'AIR', 'type': 'air', 'name': 'Air Freight', 'transit_days_min': 1, 'transit_days_max': 8, 'co2_per_kg': 0.5},
            {'code': 'SEA', 'type': 'sea', 'name': 'Sea Freight', 'transit_days_min': 15, 'transit_days_max': 45, 'co2_per_kg': 0.01},
            {'code': 'RAIL', 'type': 'rail', 'name': 'Rail Freight', 'transit_days_min': 10, 'transit_days_max': 20, 'co2_per_kg': 0.02},
            {'code': 'TRUCK', 'type': 'truck', 'name': 'Truck/Road', 'transit_days_min': 2, 'transit_days_max': 10, 'co2_per_kg': 0.1},
        ]
        
        modes = {}
        for data in modes_data:
            mode, created = TransportMode.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            modes[data['code']] = mode
        
        # Shipping routes
        route_combos = [
            (countries['US'], countries['GB'], ['AIR', 'SEA']),
            (countries['US'], countries['CA'], ['AIR', 'SEA', 'RAIL', 'TRUCK']),
            (countries['US'], countries['DE'], ['AIR', 'SEA']),
            (countries['DE'], countries['FR'], ['AIR', 'TRUCK', 'RAIL']),
            (countries['CN'], countries['US'], ['AIR', 'SEA']),
            (countries['JP'], countries['US'], ['AIR', 'SEA']),
            (countries['GB'], countries['US'], ['AIR', 'SEA']),
        ]
        
        for origin, dest, mode_codes in route_combos:
            for idx, mode_code in enumerate(mode_codes, 1):
                ShippingRoute.objects.get_or_create(
                    origin_country=origin,
                    destination_country=dest,
                    transport_mode=modes[mode_code],
                    defaults={'carrier': 'Multiple', 'priority': idx, 'is_available': True}
                )
        
        # Warehouses
        warehouse_data = [
            {'country': countries['US'], 'city': 'Los Angeles', 'state': 'California', 'postal_code': '90001'},
            {'country': countries['US'], 'city': 'New York', 'state': 'New York', 'postal_code': '10001'},
            {'country': countries['GB'], 'city': 'London', 'state': '', 'postal_code': 'SW1A 1AA'},
            {'country': countries['DE'], 'city': 'Hamburg', 'state': '', 'postal_code': '20095'},
        ]
        
        for idx, data in enumerate(warehouse_data, 1):
            Warehouse.objects.get_or_create(
                name=f"YuuSell Warehouse {data['city']}",
                country=data['country'],
                defaults={
                    'city': data['city'],
                    'state_province': data['state'],
                    'postal_code': data['postal_code'],
                    'street_address': f'{random.randint(100, 9999)} Warehouse St',
                    'full_name': f"YuuSell Logistics Warehouse {data['city']}",
                    'phone': f'+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}',
                    'shipping_categories': ['all'],
                    'is_active': True,
                    'priority': idx,
                }
            )
        
        # Buying service settings
        # Buying fee is now hardcoded to 7.5% - no settings model needed
        
        # Pickup calculation settings (global fallback)
        PickupCalculationSettings.objects.get_or_create(
            country=countries['US'],
            state='',
            shipping_category='all',
            is_global_fallback=True,
            defaults={
                'base_pickup_fee': Decimal('25.00'),
                'per_kg_rate': Decimal('0.50'),
                'per_km_rate': Decimal('1.50'),
                'minimum_pickup_fee': Decimal('15.00'),
            }
        )
        
        # Shipping calculation settings
        for mode in modes.values():
            ShippingCalculationSettings.objects.get_or_create(
                transport_mode=mode,
                route=None,
                defaults={
                    'shipping_categories': ['all'],
                    'per_kg_rate': Decimal('8.50') if mode.type == 'air' else Decimal('0.50'),
                    'fuel_surcharge_percent': Decimal('15.00'),
                    'security_fee': Decimal('25.00'),
                }
            )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Base data created'))

    def create_users(self):
        """Create sample users"""
        self.stdout.write('Creating users...')
        
        users_data = [
            {'email': 'john.doe@example.com', 'first_name': 'John', 'last_name': 'Doe', 'phone': '+1-555-0101'},
            {'email': 'jane.smith@example.com', 'first_name': 'Jane', 'last_name': 'Smith', 'phone': '+1-555-0102'},
            {'email': 'michael.brown@example.com', 'first_name': 'Michael', 'last_name': 'Brown', 'phone': '+1-555-0103'},
            {'email': 'emily.jones@example.com', 'first_name': 'Emily', 'last_name': 'Jones', 'phone': '+1-555-0104'},
            {'email': 'david.wilson@example.com', 'first_name': 'David', 'last_name': 'Wilson', 'phone': '+1-555-0105'},
            {'email': 'sarah.taylor@example.com', 'first_name': 'Sarah', 'last_name': 'Taylor', 'phone': '+44-20-7946-0958'},
            {'email': 'robert.moore@example.com', 'first_name': 'Robert', 'last_name': 'Moore', 'phone': '+1-555-0106'},
            {'email': 'lisa.anderson@example.com', 'first_name': 'Lisa', 'last_name': 'Anderson', 'phone': '+1-555-0107'},
        ]
        
        users = []
        for data in users_data:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone': data['phone'],
                    'email_verified': True,
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            users.append(user)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(users)} users'))
        return users

    def create_user_data(self, users):
        """Create addresses and preferences for users"""
        self.stdout.write('Creating user addresses and preferences...')
        
        countries = {
            'US': Country.objects.get(code='US'),
            'GB': Country.objects.get(code='GB'),
            'CA': Country.objects.get(code='CA'),
        }
        
        address_data = [
            {'country': 'US', 'city': 'Los Angeles', 'state': 'California', 'postal': '90001', 'type': 'shipping'},
            {'country': 'US', 'city': 'New York', 'state': 'New York', 'postal': '10001', 'type': 'billing'},
            {'country': 'GB', 'city': 'London', 'state': '', 'postal': 'SW1A 1AA', 'type': 'shipping'},
            {'country': 'CA', 'city': 'Toronto', 'state': 'Ontario', 'postal': 'M5H 2N2', 'type': 'shipping'},
        ]
        
        # Address model removed - addresses are now stored as JSONField in models
        for user in users[:4]:  # Add addresses to first 4 users
            # Create preferences
            UserPreference.objects.get_or_create(
                user=user,
                defaults={
                    'language': 'en',
                    'currency': 'USD',
                    'notifications_email': True,
                    'notifications_sms': False,
                    'theme': random.choice(['light', 'dark']),
                }
            )
        
        self.stdout.write(self.style.SUCCESS('  ✓ User data created'))

    def create_buying_data(self, users):
        """Create buying requests and quotes"""
        self.stdout.write('Creating buying requests and quotes...')
        
        product_data = [
            {'name': 'iPhone 15 Pro', 'description': 'Apple iPhone 15 Pro 256GB', 'price': Decimal('999.00')},
            {'name': 'Sony WH-1000XM5', 'description': 'Sony WH-1000XM5 Wireless Headphones', 'price': Decimal('399.99')},
            {'name': 'Nintendo Switch OLED', 'description': 'Nintendo Switch OLED Console', 'price': Decimal('349.99')},
            {'name': 'MacBook Pro 14"', 'description': 'Apple MacBook Pro 14-inch M3', 'price': Decimal('1999.00')},
            {'name': 'Canon EOS R5', 'description': 'Canon EOS R5 Camera Body', 'price': Decimal('3899.00')},
            {'name': 'PlayStation 5', 'description': 'Sony PlayStation 5 Console', 'price': Decimal('499.99')},
        ]
        
        statuses = ['pending', 'quoted', 'quote_approved', 'payment_pending', 'payment_received', 'purchasing', 'purchased', 'in_transit_to_warehouse', 'received_at_warehouse']
        
        for user in users[:6]:
            num_requests = random.randint(1, 3)
            for _ in range(num_requests):
                product = random.choice(product_data)
                status = random.choice(statuses)
                
                buying_request = BuyingRequest.objects.create(
                    user=user,
                    product_name=product['name'],
                    product_description=product['description'],
                    product_url=f'https://example.com/products/{product["name"].lower().replace(" ", "-")}',
                    max_budget=product['price'] + Decimal('200.00'),
                    shipping_address={
                        'full_name': f"{user.first_name} {user.last_name}",
                        'street_address': f'{random.randint(100, 9999)} Main St',
                        'city': 'Los Angeles',
                        'state': 'California',
                        'postal_code': '90001',
                        'country': 'US',
                    },
                    status=status,
                )
                
                # Create quotes for some requests
                if status in ['quoted', 'quote_approved', 'payment_pending', 'payment_received']:
                    transport_modes = list(TransportMode.objects.all()[:2])
                    for mode in transport_modes:
                        product_cost = product['price']
                        buying_fee = product_cost * Decimal('0.075')
                        shipping_cost = Decimal(str(random.randint(50, 300)))
                        total = product_cost + buying_fee + shipping_cost
                        
                        BuyAndShipQuote.objects.create(
                            buying_request=buying_request,
                            product_cost=product_cost,
                            buying_service_fee=buying_fee,
                            buying_service_fee_percent=Decimal('7.50'),
                            shipping_mode=mode,
                            shipping_cost=shipping_cost,
                            shipping_service_name=f'{mode.name} Express',
                            estimated_delivery_days=random.randint(5, 15),
                            total_cost=total,
                            status='approved' if status in ['quote_approved', 'payment_pending', 'payment_received'] else 'pending',
                        )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Buying data created'))

    def create_shipping_data(self, users):
        """Create shipments and packages"""
        self.stdout.write('Creating shipments and packages...')
        
        countries = Country.objects.all()
        transport_modes = TransportMode.objects.all()
        source_types = ['ship_my_items', 'buy_and_ship']
        categories = ['small_parcel', 'heavy_parcel', 'ltl_freight']
        statuses = ['quote_requested', 'quote_approved', 'payment_received', 'processing', 'in_transit', 'delivered']
        
        for user in users[:8]:
            num_shipments = random.randint(1, 4)
            for _ in range(num_shipments):
                origin_country = random.choice(countries)
                destination_country = random.choice(countries.exclude(code=origin_country.code))
                transport_mode = random.choice(transport_modes)
                category = random.choice(categories)
                status = random.choice(statuses)
                source_type = random.choice(source_types)
                
                weight = Decimal(str(random.randint(1, 100)))
                shipping_cost = Decimal(str(random.randint(50, 500)))
                insurance_cost = Decimal(str(random.randint(10, 50)))
                
                shipment = LogisticsShipment.objects.create(
                    user=user,
                    source_type=source_type,
                    shipping_category=category,
                    transport_mode=transport_mode,
                    service_level='Express' if transport_mode.type == 'air' else 'Standard',
                    actual_weight=weight,
                    chargeable_weight=weight,
                    shipping_cost=shipping_cost,
                    insurance_cost=insurance_cost,
                    service_fee=Decimal('25.00'),
                    total_cost=shipping_cost + insurance_cost + Decimal('25.00'),
                    origin_address={
                        'full_name': f"{user.first_name} {user.last_name}",
                        'street_address': f'{random.randint(100, 9999)} Main St',
                        'city': 'Los Angeles',
                        'state': 'California',
                        'postal_code': '90001',
                        'country': origin_country.code,
                    },
                    destination_address={
                        'full_name': f"{user.first_name} {user.last_name}",
                        'street_address': f'{random.randint(100, 9999)} Oak Ave',
                        'city': 'London',
                        'state': '',
                        'postal_code': 'SW1A 1AA',
                        'country': destination_country.code,
                    },
                    status=status,
                    tracking_number=f'TRK{random.randint(100000000, 999999999)}' if status != 'quote_requested' else '',
                    carrier='DHL' if transport_mode.type == 'air' else 'Maersk',
                    estimated_delivery=timezone.now() + timedelta(days=random.randint(5, 20)) if status in ['in_transit', 'delivered'] else None,
                )
                
                # Create packages for some shipments
                if source_type == 'ship_my_items' and random.choice([True, False]):
                    num_packages = random.randint(1, 3)
                    for i in range(num_packages):
                        package_status = 'pending' if shipment.status == 'quote_requested' else random.choice(['received', 'ready', 'in_transit', 'delivered'])
                        package = Package.objects.create(
                            user=user,
                            weight=weight / num_packages,
                            length=Decimal(str(random.randint(20, 50))),
                            width=Decimal(str(random.randint(15, 40))),
                            height=Decimal(str(random.randint(10, 30))),
                            declared_value=Decimal(str(random.randint(100, 1000))),
                            status=package_status,
                            description=f'Package {i+1} for shipment {shipment.shipment_number}',
                            shipment=shipment,
                            received_date=timezone.now() - timedelta(days=random.randint(1, 30)) if package_status in ['received', 'ready', 'in_transit', 'delivered'] else None,
                        )
                        shipment.packages.add(package)
        
        self.stdout.write(self.style.SUCCESS('  ✓ Shipping data created'))

    def create_vehicles(self, users):
        """Create vehicle shipping requests"""
        self.stdout.write('Creating vehicles...')
        
        vehicle_data = [
            {'make': 'Toyota', 'model': 'Camry', 'year': 2020, 'type': 'car'},
            {'make': 'Honda', 'model': 'Civic', 'year': 2019, 'type': 'car'},
            {'make': 'Ford', 'model': 'F-150', 'year': 2021, 'type': 'truck'},
            {'make': 'BMW', 'model': 'X5', 'year': 2022, 'type': 'car'},
            {'make': 'Tesla', 'model': 'Model 3', 'year': 2023, 'type': 'car'},
            {'make': 'Harley-Davidson', 'model': 'Street Glide', 'year': 2021, 'type': 'motorcycle'},
        ]
        
        statuses = ['pending_documents', 'documents_signed', 'payment_pending', 'payment_received', 'in_transit', 'delivered']
        
        for user in users[:5]:
            vehicle_info = random.choice(vehicle_data)
            status = random.choice(statuses)
            
            Vehicle.objects.create(
                user=user,
                make=vehicle_info['make'],
                model=vehicle_info['model'],
                year=vehicle_info['year'],
                vehicle_type=vehicle_info['type'],
                shipping_method=random.choice(['roro', 'container_20ft', 'container_40ft']),
                condition=random.choice(['running', 'non_running']),
                length=Decimal(str(random.randint(400, 600))),
                width=Decimal(str(random.randint(180, 220))),
                height=Decimal(str(random.randint(150, 200))),
                weight=Decimal(str(random.randint(1000, 2500))),
                origin_address={
                    'full_name': f"{user.first_name} {user.last_name}",
                    'street_address': f'{random.randint(100, 9999)} Auto Plaza',
                    'city': 'Los Angeles',
                    'state': 'California',
                    'postal_code': '90001',
                    'country': 'US',
                },
                destination_address={
                    'full_name': f"{user.first_name} {user.last_name}",
                    'street_address': f'{random.randint(100, 9999)} Delivery Rd',
                    'city': 'London',
                    'state': '',
                    'postal_code': 'SW1A 1AA',
                    'country': 'GB',
                },
                quote_amount=Decimal(str(random.randint(2000, 5000))),
                pickup_cost=Decimal(str(random.randint(100, 300))),
                total_amount=Decimal(str(random.randint(2100, 5300))),
                payment_paid=(status in ['payment_received', 'in_transit', 'delivered']),
                status=status,
            )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Vehicles created'))

    def create_vehicle_documents(self):
        """Create vehicle documents"""
        self.stdout.write('Creating vehicle documents...')
        
        document_data = [
            {'name': 'Shipping Agreement', 'document_type': 'shipping_agreement', 'description': 'Standard shipping agreement for vehicle transport'},
            {'name': 'Export Declaration', 'document_type': 'export_declaration', 'description': 'Export declaration form for customs'},
            {'name': 'Power of Attorney', 'document_type': 'power_of_attorney', 'description': 'Power of attorney for vehicle handling'},
            {'name': 'Customs Declaration', 'document_type': 'customs_declaration', 'description': 'Customs declaration form'},
            {'name': 'Insurance Waiver', 'document_type': 'insurance_waiver', 'description': 'Insurance waiver document'},
        ]
        
        for data in document_data:
            VehicleDocument.objects.get_or_create(
                name=data['name'],
                defaults={
                    'document_type': data['document_type'],
                    'description': data['description'],
                    'is_required': True,
                    'is_active': True,
                }
            )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Vehicle documents created'))

    def create_payments(self, users):
        """Create payment records"""
        self.stdout.write('Creating payments...')
        
        payment_types = ['shipping', 'buy_and_ship_quote', 'vehicle_shipping', 'warehouse_label']
        statuses = ['pending', 'processing', 'completed', 'failed']
        
        # Get shipments and vehicles
        shipments = list(LogisticsShipment.objects.all())
        buying_requests = list(BuyingRequest.objects.all())
        vehicles = list(Vehicle.objects.all())
        
        for user in users:
            num_payments = random.randint(2, 5)
            for _ in range(num_payments):
                payment_type = random.choice(payment_types)
                status = random.choice(statuses)
                amount = Decimal(str(random.randint(50, 2000)))
                
                payment_data = {
                    'user': user,
                    'amount': amount,
                    'currency': 'USD',
                    'payment_type': payment_type,
                    'status': status,
                    'stripe_payment_intent_id': f'pi_{random.randint(100000000000000000, 999999999999999999)}' if status == 'completed' else '',
                }
                
                # Link to related objects
                if payment_type == 'shipping' and shipments:
                    payment_data['shipment'] = random.choice(shipments)
                elif payment_type == 'buy_and_ship_quote' and buying_requests:
                    payment_data['buying_request'] = random.choice(buying_requests)
                elif payment_type == 'vehicle_shipping' and vehicles:
                    payment_data['vehicle'] = random.choice(vehicles)
                
                Payment.objects.create(**payment_data)
        
        self.stdout.write(self.style.SUCCESS('  ✓ Payments created'))

    def create_tracking_updates(self):
        """Create tracking updates for shipments"""
        self.stdout.write('Creating tracking updates...')
        
        shipments = LogisticsShipment.objects.exclude(status='quote_requested')
        statuses = ['Label Created', 'In Transit', 'Arrived at Facility', 'Out for Delivery', 'Delivered']
        
        for shipment in shipments[:20]:  # Add updates to first 20 shipments
            num_updates = random.randint(1, 5)
            base_time = shipment.created_at
            
            for i in range(num_updates):
                status = statuses[min(i, len(statuses) - 1)]
                TrackingUpdate.objects.create(
                    shipment=shipment,
                    status=status,
                    location=random.choice(['Los Angeles, CA', 'New York, NY', 'London, UK', 'Hamburg, Germany', 'Tokyo, Japan']),
                    timestamp=base_time + timedelta(days=i),
                    source='webhook' if i < 2 else 'manual',
                    carrier_tracking_number=shipment.tracking_number if shipment.tracking_number else f'TRK{random.randint(100000000, 999999999)}',
                )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Tracking updates created'))

    def create_warehouse_data(self, users):
        """Create warehouse receiving records and labels"""
        self.stdout.write('Creating warehouse data...')
        
        packages = Package.objects.filter(status__in=['received', 'ready'])
        
        # Create warehouse receiving records
        for package in packages[:10]:
            WarehouseReceiving.objects.get_or_create(
                package=package,
                defaults={
                    'received_by': random.choice(users) if users else None,
                    'storage_location': f'Aisle {random.randint(1, 10)}-Shelf {random.randint(1, 20)}',
                    'inspection_notes': 'Package received in good condition',
                    'damage_reported': False,
                    'prohibited_items_found': False,
                }
            )
        
        # Create warehouse labels
        for user in users[:5]:
            WarehouseLabel.objects.create(
                user=user,
                label_number=f'WHL{random.randint(100000, 999999)}',
                carrier=random.choice(['UPS', 'FedEx', 'DHL']),
                service_name='Ground Shipping',
                tracking_number=f'1Z{random.randint(1000000000000000, 9999999999999999)}',
                label_url=f'https://example.com/labels/{random.randint(100000, 999999)}.pdf',
                cost=Decimal(str(random.randint(10, 50))),
                weight=Decimal(str(random.randint(1, 20))),
                dimensions={'length': 30, 'width': 25, 'height': 15},
                pickup_address={
                    'full_name': f"{user.first_name} {user.last_name}",
                    'street_address': f'{random.randint(100, 9999)} Main St',
                    'city': 'Los Angeles',
                    'state': 'California',
                    'postal_code': '90001',
                    'country': 'US',
                },
                warehouse_address={
                    'full_name': 'YuuSell Logistics Warehouse',
                    'street_address': '1234 Warehouse St',
                    'city': 'Los Angeles',
                    'state': 'California',
                    'postal_code': '90001',
                    'country': 'US',
                },
                status=random.choice(['pending', 'generated', 'printed', 'in_transit', 'delivered']),
            )
        
        # Create pickup requests for shipments
        shipments_with_pickup = LogisticsShipment.objects.filter(source_type='ship_my_items')[:5]
        for shipment in shipments_with_pickup:
            PickupRequest.objects.get_or_create(
                shipment=shipment,
                defaults={
                    'worker': random.choice(users) if users else None,
                    'pickup_address': shipment.origin_address,
                    'contact_name': shipment.user.get_full_name(),
                    'contact_phone': shipment.user.phone,
                    'status': random.choice(['pending', 'scheduled', 'completed']),
                    'scheduled_date': timezone.now().date() + timedelta(days=random.randint(1, 7)),
                    'scheduled_datetime': timezone.now() + timedelta(days=random.randint(1, 7)),
                }
            )
        
        # Create pickup schedules
        for user in users[:5]:
            PickupSchedule.objects.create(
                user=user,
                pickup_number=f'PKP{random.randint(100000, 999999)}',
                pickup_address={
                    'full_name': f"{user.first_name} {user.last_name}",
                    'street_address': f'{random.randint(100, 9999)} Main St',
                    'city': 'Los Angeles',
                    'state': 'California',
                    'postal_code': '90001',
                    'country': 'US',
                },
                pickup_date=timezone.now().date() + timedelta(days=random.randint(1, 7)),
                pickup_time_slot=random.choice(['09:00-12:00', '12:00-15:00', '15:00-18:00']),
                weight=Decimal(str(random.randint(1, 50))),
                dimensions={'length': 30, 'width': 25, 'height': 15},
                number_of_packages=random.randint(1, 5),
                contact_name=f"{user.first_name} {user.last_name}",
                contact_phone=user.phone,
                status=random.choice(['pending', 'confirmed', 'scheduled', 'picked_up']),
            )
        
        self.stdout.write(self.style.SUCCESS('  ✓ Warehouse data created'))

