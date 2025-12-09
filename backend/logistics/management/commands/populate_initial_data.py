"""
Management command to populate initial data for logistics system
"""
from django.core.management.base import BaseCommand
from logistics.models import Country, TransportMode, ShippingRoute


class Command(BaseCommand):
    help = 'Populate initial countries, transport modes, and routes'

    def handle(self, *args, **options):
        self.stdout.write('Populating initial data...')

        # Create countries
        countries_data = [
            {'code': 'US', 'name': 'United States', 'continent': 'North America'},
            {'code': 'GB', 'name': 'United Kingdom', 'continent': 'Europe'},
            {'code': 'CA', 'name': 'Canada', 'continent': 'North America'},
            {'code': 'DE', 'name': 'Germany', 'continent': 'Europe'},
            {'code': 'FR', 'name': 'France', 'continent': 'Europe'},
            {'code': 'CN', 'name': 'China', 'continent': 'Asia'},
            {'code': 'JP', 'name': 'Japan', 'continent': 'Asia'},
            {'code': 'AU', 'name': 'Australia', 'continent': 'Oceania'},
        ]

        for country_data in countries_data:
            country, created = Country.objects.get_or_create(
                code=country_data['code'],
                defaults=country_data
            )
            if created:
                self.stdout.write(f'Created country: {country.name}')

        # Create transport modes
        modes_data = [
            {'code': 'AIR', 'type': 'air', 'name': 'Air Freight', 'transit_days_min': 1, 'transit_days_max': 8, 'co2_per_kg': 0.5},
            {'code': 'SEA', 'type': 'sea', 'name': 'Sea Freight', 'transit_days_min': 15, 'transit_days_max': 45, 'co2_per_kg': 0.01},
            {'code': 'RAIL', 'type': 'rail', 'name': 'Rail Freight', 'transit_days_min': 10, 'transit_days_max': 20, 'co2_per_kg': 0.02},
            {'code': 'TRUCK', 'type': 'truck', 'name': 'Truck/Road', 'transit_days_min': 2, 'transit_days_max': 10, 'co2_per_kg': 0.1},
        ]

        for mode_data in modes_data:
            mode, created = TransportMode.objects.get_or_create(
                code=mode_data['code'],
                defaults=mode_data
            )
            if created:
                self.stdout.write(f'Created transport mode: {mode.name}')

        # Create sample routes
        us = Country.objects.get(code='US')
        gb = Country.objects.get(code='GB')
        ca = Country.objects.get(code='CA')
        de = Country.objects.get(code='DE')
        cn = Country.objects.get(code='CN')

        air_mode = TransportMode.objects.get(code='AIR')
        sea_mode = TransportMode.objects.get(code='SEA')
        rail_mode = TransportMode.objects.get(code='RAIL')
        truck_mode = TransportMode.objects.get(code='TRUCK')

        routes_data = [
            # US to UK: Air and Sea only
            {'origin': us, 'destination': gb, 'mode': air_mode, 'carrier': 'Multiple', 'priority': 1},
            {'origin': us, 'destination': gb, 'mode': sea_mode, 'carrier': 'Multiple', 'priority': 2},
            # US to Canada: All modes
            {'origin': us, 'destination': ca, 'mode': air_mode, 'carrier': 'Multiple', 'priority': 1},
            {'origin': us, 'destination': ca, 'mode': sea_mode, 'carrier': 'Multiple', 'priority': 2},
            {'origin': us, 'destination': ca, 'mode': rail_mode, 'carrier': 'Multiple', 'priority': 3},
            {'origin': us, 'destination': ca, 'mode': truck_mode, 'carrier': 'Multiple', 'priority': 4},
            # Germany to France: Truck, Air, Rail
            {'origin': de, 'destination': Country.objects.get(code='FR'), 'mode': truck_mode, 'carrier': 'Multiple', 'priority': 1},
            {'origin': de, 'destination': Country.objects.get(code='FR'), 'mode': air_mode, 'carrier': 'Multiple', 'priority': 2},
            {'origin': de, 'destination': Country.objects.get(code='FR'), 'mode': rail_mode, 'carrier': 'Multiple', 'priority': 3},
            # China to US: Air and Sea
            {'origin': cn, 'destination': us, 'mode': air_mode, 'carrier': 'Multiple', 'priority': 1},
            {'origin': cn, 'destination': us, 'mode': sea_mode, 'carrier': 'Multiple', 'priority': 2},
        ]

        for route_data in routes_data:
            route, created = ShippingRoute.objects.get_or_create(
                origin_country=route_data['origin'],
                destination_country=route_data['destination'],
                transport_mode=route_data['mode'],
                defaults={
                    'carrier': route_data['carrier'],
                    'priority': route_data['priority'],
                }
            )
            if created:
                self.stdout.write(f'Created route: {route.origin_country.code} → {route.destination_country.code} ({route.transport_mode.name})')

        self.stdout.write(self.style.SUCCESS('Successfully populated initial data!'))

