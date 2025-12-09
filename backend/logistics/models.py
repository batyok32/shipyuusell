from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import random
import string
from datetime import datetime


def generate_package_reference_number():
    """Generate unique reference number for packages: PKG-YYYYMMDD-XXXXXX"""
    prefix = 'PKG'
    date_str = datetime.now().strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{date_str}-{random_str}"


class Country(models.Model):
    """Countries with ISO codes"""
    code = models.CharField(max_length=2, unique=True, primary_key=True)  # ISO 3166-1 alpha-2
    name = models.CharField(max_length=100)
    continent = models.CharField(max_length=50)
    customs_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class TransportMode(models.Model):
    """Transport modes: Air, Sea, Rail, Truck"""
    MODE_TYPES = [
        ('air', 'Air Freight'),
        ('sea', 'Sea Freight'),
        ('rail', 'Rail Freight'),
        ('truck', 'Truck/Road'),
    ]
    
    code = models.CharField(max_length=10, unique=True)
    type = models.CharField(max_length=20, choices=MODE_TYPES)
    name = models.CharField(max_length=100)
    transit_days_min = models.IntegerField(default=1)
    transit_days_max = models.IntegerField(default=30)
    co2_per_kg = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class ShippingRoute(models.Model):
    """Routes between countries with available transport modes"""
    origin_country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='origin_routes')
    destination_country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='destination_routes')
    transport_mode = models.ForeignKey(TransportMode, on_delete=models.CASCADE)
    is_available = models.BooleanField(default=True)
    carrier = models.CharField(max_length=100, blank=True)
    priority = models.IntegerField(default=0)  # Higher priority shown first
    pickup_available = models.BooleanField(default=False)  # For routes that support pickup
    local_shipping_only = models.BooleanField(default=False)  # For same-country routes that skip warehouse
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['origin_country', 'destination_country', 'transport_mode']
        ordering = ['-priority', 'transport_mode']
    
    def __str__(self):
        return f"{self.origin_country.code} → {self.destination_country.code} ({self.transport_mode.name})"


class EasyShipRate(models.Model):
    """Cached EasyShip rates with 5-minute expiry"""
    origin_country = models.CharField(max_length=2)
    destination_country = models.CharField(max_length=2)
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    dimensions = models.JSONField(default=dict)  # {length, width, height}
    carrier = models.CharField(max_length=100)
    service_name = models.CharField(max_length=200)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    transit_days = models.IntegerField(null=True, blank=True)
    rate_data = models.JSONField(default=dict)  # Full EasyShip response
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        indexes = [
            models.Index(fields=['origin_country', 'destination_country', 'weight']),
            models.Index(fields=['expires_at']),
        ]


class Package(models.Model):
    """Packages received at warehouse"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('received', 'Received at Warehouse'),
        ('inspected', 'Inspected'),
        ('ready', 'Ready to Ship'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('returned', 'Returned'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='packages')
    reference_number = models.CharField(max_length=100, unique=True, default=generate_package_reference_number)
    tracking_number = models.CharField(max_length=200, blank=True)  # Inbound tracking
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # kg
    length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # cm
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # cm
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # cm
    
    # Photo uploads (primary method - actual file uploads)
    photo_1 = models.ImageField(upload_to='packages/photos/', blank=True, null=True, help_text="Inbound package photo 1")
    photo_2 = models.ImageField(upload_to='packages/photos/', blank=True, null=True, help_text="Inbound package photo 2")
    photo_3 = models.ImageField(upload_to='packages/photos/', blank=True, null=True, help_text="Inbound package photo 3")
    photo_4 = models.ImageField(upload_to='packages/photos/', blank=True, null=True, help_text="Inbound package photo 4")
    photo_5 = models.ImageField(upload_to='packages/photos/', blank=True, null=True, help_text="Inbound package photo 5")
    
    # Delivery photos (when delivered to user)
    delivery_photo_1 = models.ImageField(upload_to='packages/delivery/', blank=True, null=True, help_text="Delivery photo 1")
    delivery_photo_2 = models.ImageField(upload_to='packages/delivery/', blank=True, null=True, help_text="Delivery photo 2")
    delivery_photo_3 = models.ImageField(upload_to='packages/delivery/', blank=True, null=True, help_text="Delivery photo 3")
    delivery_photo_4 = models.ImageField(upload_to='packages/delivery/', blank=True, null=True, help_text="Delivery photo 4")
    delivery_photo_5 = models.ImageField(upload_to='packages/delivery/', blank=True, null=True, help_text="Delivery photo 5")
    
    # Legacy: Keep JSONField for backward compatibility (URLs from external sources)
    photos = models.JSONField(default=list, blank=True, help_text="Legacy: List of photo URLs (for external sources)")
    delivery_photos = models.JSONField(default=list, blank=True, help_text="Legacy: List of delivery photo URLs")
    received_date = models.DateTimeField(null=True, blank=True)
    storage_expiry_date = models.DateTimeField(null=True, blank=True)
    declared_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    storage_location = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    
    # Link to shipment (primary shipment for this package)
    shipment = models.ForeignKey('LogisticsShipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_packages', help_text="Primary shipment this package belongs to")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['reference_number']),
        ]
    
    def __str__(self):
        return f"{self.reference_number} - {self.user.email}"
    
    def save(self, *args, **kwargs):
        """Override save to automatically update LogisticsShipment status when package status changes"""
        from django.db.models.signals import post_save
        from django.utils import timezone
        
        # Get old status before saving
        old_status = None
        if self.pk:
            try:
                old_obj = Package.objects.get(pk=self.pk)
                old_status = old_obj.status
            except Package.DoesNotExist:
                pass
        
        # Save the package
        super().save(*args, **kwargs)
        
        # Update LogisticsShipment status if package status changed and shipment exists
        if old_status != self.status and self.shipment:
            # Map package status to shipment status
            status_mapping = {
                'received': 'processing',
                'ready': 'ready_to_ship',
                'in_transit': 'in_transit',
                'delivered': 'delivered',
            }
            
            new_shipment_status = status_mapping.get(self.status)
            if new_shipment_status and self.shipment.status != new_shipment_status:
                # Only update if shipment status is not already at a more advanced stage
                # (e.g., don't downgrade from 'delivered' to 'in_transit')
                status_hierarchy = {
                    'quote_requested': 0,
                    'quote_approved': 1,
                    'payment_pending': 2,
                    'payment_received': 3,
                    'processing': 4,
                    'ready_to_ship': 5,
                    'dispatched': 6,
                    'in_transit': 7,
                    'customs_clearance': 8,
                    'out_for_delivery': 9,
                    'delivered': 10,
                    'cancelled': -1,
                }
                
                current_level = status_hierarchy.get(self.shipment.status, 0)
                new_level = status_hierarchy.get(new_shipment_status, 0)
                
                # Only update if new status is more advanced
                if new_level > current_level:
                    self.shipment.status = new_shipment_status
                    
                    # Set delivery date if delivered
                    if self.status == 'delivered':
                        self.shipment.actual_delivery = timezone.now()
                    
                    self.shipment.save()
                    
                    # Create TrackingUpdate (signal will handle this)
                    from logistics.models import TrackingUpdate
                    TrackingUpdate.objects.create(
                        shipment=self.shipment,
                        status=new_shipment_status,
                        location=self.shipment.destination_address.get('city', '') if self.shipment.destination_address else '',
                        timestamp=timezone.now(),
                        source='system',
                        raw_data={
                            'package_reference': self.reference_number,
                            'package_status': self.status,
                            'old_package_status': old_status,
                        }
                    )


class LogisticsShipment(models.Model):
    """International shipments"""
    STATUS_CHOICES = [
        ('quote_requested', 'Quote Requested'),
        ('quote_approved', 'Quote Approved'),
        ('payment_pending', 'Payment Pending'),
        ('payment_received', 'Payment Received'),
        ('label_generating', 'Generating Label'),
        ('processing', 'Processing'),
        ('dispatched', 'Dispatched'),
        ('in_transit', 'In Transit'),
        ('customs_clearance', 'Customs Clearance'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    SOURCE_TYPES = [
        ('ship_my_items', 'Ship My Items'),
        ('buy_and_ship', 'Buy & Ship'),
        ('vehicle', 'Vehicle'),
    ]
    
    SHIPPING_CATEGORIES = [
        ('small_parcel', 'Small Parcel (0-30kg)'),
        ('heavy_parcel', 'Heavy Parcel (30-100kg)'),
        ('ltl_freight', 'LTL Freight (100-4000kg)'),
        ('ftl_freight', 'FTL Freight (4000+kg)'),
        ('vehicle', 'Vehicle'),
        ('super_heavy', 'Super Heavy/Oversized'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shipments')
    shipment_number = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    shipping_category = models.CharField(max_length=20, choices=SHIPPING_CATEGORIES, default='small_parcel')
    transport_mode = models.ForeignKey(TransportMode, on_delete=models.SET_NULL, null=True)
    service_level = models.CharField(max_length=50, blank=True)  # Express, Standard, Economy
    freight_class = models.IntegerField(null=True, blank=True)  # For LTL freight (50-500)
    permits_required = models.BooleanField(default=False)  # For super heavy/oversized
    
    # Weight and dimensions
    actual_weight = models.DecimalField(max_digits=10, decimal_places=2)  # kg
    chargeable_weight = models.DecimalField(max_digits=10, decimal_places=2)  # kg (max of actual or dimensional)
    actual_volume = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)  # CBM
    
    # Addresses
    origin_address = models.JSONField(default=dict)
    destination_address = models.JSONField(default=dict)
    
    # Pricing
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2)
    insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Tracking
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='quote_requested')
    tracking_number = models.CharField(max_length=200, blank=True)
    carrier = models.CharField(max_length=100, blank=True)
    easyship_shipment_id = models.CharField(max_length=200, blank=True)
    easyship_label_url = models.CharField(max_length=500, blank=True)
    tracking_page_url = models.CharField(max_length=500, blank=True)  # EasyShip tracking page URL
    local_carrier_tracking_number = models.CharField(max_length=200, blank=True)  # For EasyShip tracking
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    actual_delivery = models.DateTimeField(null=True, blank=True)
    
    # Quote request link
    quote_request = models.ForeignKey('QuoteRequest', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    
    # Additional costs
    pickup_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_local_shipping = models.BooleanField(default=False)  # True if same country shipping
    
    # Packages linked to this shipment
    packages = models.ManyToManyField(Package, related_name='shipments', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['shipment_number']),
            models.Index(fields=['tracking_number']),
        ]
    
    def __str__(self):
        return f"{self.shipment_number} - {self.user.email}"


class ShippingCalculationSettings(models.Model):
    """Global and route-specific calculation settings"""
    SHIPPING_CATEGORIES = [
        ('small_parcel', 'Small Parcel (0-30kg)'),
        ('heavy_parcel', 'Heavy Parcel (30-100kg)'),
        ('ltl_freight', 'LTL Freight (100-4000kg)'),
        ('ftl_freight', 'FTL Freight (4000+kg)'),
        ('vehicle', 'Vehicle'),
        ('car', 'Car'),
        ('super_heavy', 'Super Heavy/Oversized'),
        ('all', 'All Categories'),
    ]
    
    route = models.ForeignKey(ShippingRoute, on_delete=models.CASCADE, related_name='calculation_settings', null=True, blank=True)
    transport_mode = models.ForeignKey(TransportMode, on_delete=models.CASCADE, related_name='calculation_settings')
    shipping_categories = models.JSONField(
        default=list,
        help_text="List of shipping categories these settings apply to. Use ['all'] for all categories. Leave empty to apply to all."
    )
    
    # Air freight settings
    base_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base rate for air freight (flat fee)")
    per_kg_rate = models.DecimalField(max_digits=10, decimal_places=4, default=8.50, help_text="Per kilogram rate for air freight")
    fuel_surcharge_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)  # Default 15%
    security_fee = models.DecimalField(max_digits=10, decimal_places=2, default=25.00)  # Default $25
    dimensional_weight_divisor = models.DecimalField(max_digits=10, decimal_places=2, default=5000.00)  # Default 5000 for air
    handling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Handling fee for air freight")
    bulk_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Bulk discount percentage")
    
    # Sea freight LCL settings
    base_rate_sea = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base rate for sea freight (flat fee)")
    per_kg_rate_sea = models.DecimalField(max_digits=10, decimal_places=4, default=0.00, help_text="Per kilogram rate for sea freight")
    rate_per_cbm = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)  # Default $65/CBM
    rate_per_ton = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)  # Default $150/ton
    ocean_freight_base = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)  # Default $150
    port_origin_handling = models.DecimalField(max_digits=10, decimal_places=2, default=75.00)  # Default $75
    port_destination_handling = models.DecimalField(max_digits=10, decimal_places=2, default=120.00)  # Default $120
    documentation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=45.00)  # Default $45
    customs_clearance_fee = models.DecimalField(max_digits=10, decimal_places=2, default=75.00)  # Default $75
    destination_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=80.00)  # Default $80
    
    # Sea freight FCL settings
    container_20ft_price = models.DecimalField(max_digits=10, decimal_places=2, default=2200.00)  # Default $2,200
    container_40ft_price = models.DecimalField(max_digits=10, decimal_places=2, default=3800.00)  # Default $3,800
    container_20ft_cbm = models.DecimalField(max_digits=10, decimal_places=2, default=28.00)  # ~25-28 CBM
    container_40ft_cbm = models.DecimalField(max_digits=10, decimal_places=2, default=58.00)  # ~55-58 CBM
    container_origin_fees = models.DecimalField(max_digits=10, decimal_places=2, default=200.00)  # Default $200
    container_destination_fees = models.DecimalField(max_digits=10, decimal_places=2, default=300.00)  # Default $300
    container_customs_fee = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)  # Default $150
    container_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=200.00)  # Default $200
    
    # Rail freight settings
    base_rate_rail = models.DecimalField(max_digits=10, decimal_places=2, default=200.00, help_text="Base route cost for rail freight")
    per_kg_rate_rail = models.DecimalField(max_digits=10, decimal_places=4, default=2.50, help_text="Per kilogram rate for rail freight")
    terminal_handling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=100.00, help_text="Terminal handling fee for rail freight")
    customs_fee_rail = models.DecimalField(max_digits=10, decimal_places=2, default=50.00, help_text="Customs fee for rail freight")
    
    # Truck/Road freight settings
    base_rate_truck = models.DecimalField(max_digits=10, decimal_places=2, default=50.00, help_text="Base rate per 100 lbs (CWT) for truck/road freight LTL")
    per_kg_rate_truck = models.DecimalField(max_digits=10, decimal_places=4, default=0.00, help_text="Per kilogram rate for truck/road freight (optional)")
    customs_fee_truck = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Customs fee for truck/road freight")
    
    is_global_default = models.BooleanField(default=False)  # True for global defaults, False for route-specific
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['route', 'transport_mode']
        ordering = ['transport_mode', '-is_global_default']
    
    def get_shipping_categories_display(self):
        """Get human-readable list of shipping categories"""
        if not self.shipping_categories:
            return 'All Categories (default)'
        if 'all' in self.shipping_categories:
            return 'All Categories'
        category_names = [dict(self.SHIPPING_CATEGORIES).get(cat, cat) for cat in self.shipping_categories]
        return ', '.join(category_names)
    
    def supports_category(self, category):
        """Check if these settings support a specific shipping category"""
        if not self.shipping_categories:
            return True  # Empty list means all categories
        return 'all' in self.shipping_categories or category in self.shipping_categories
    
    def __str__(self):
        category_display = self.get_shipping_categories_display()
        if self.route:
            return f"{self.route} - {self.transport_mode.name} ({category_display})"
        return f"Global Default - {self.transport_mode.name} ({category_display})"


class QuoteRequest(models.Model):
    """Store anonymous quote requests before login"""
    session_id = models.CharField(max_length=200, db_index=True)  # Session ID for anonymous users
    origin_country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='quote_requests_origin')
    destination_country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='quote_requests_destination')
    weight = models.DecimalField(max_digits=10, decimal_places=2)  # kg
    dimensions = models.JSONField(default=dict)  # {length, width, height} in cm
    declared_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_category = models.CharField(max_length=20, default='small_parcel')
    pickup_required = models.BooleanField(default=False)
    quote_data = models.JSONField(default=dict)  # Store calculated quotes
    expires_at = models.DateTimeField()
    converted_to_shipment = models.BooleanField(default=False)  # True if user proceeded
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id', 'expires_at']),
            models.Index(fields=['converted_to_shipment']),
        ]
    
    def __str__(self):
        return f"Quote Request: {self.origin_country.code} → {self.destination_country.code} ({self.weight}kg)"


class TrackingUpdate(models.Model):
    """Store tracking events from EasyShip webhooks and manual updates"""
    shipment = models.ForeignKey(LogisticsShipment, on_delete=models.CASCADE, related_name='tracking_updates')
    carrier_tracking_number = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    timestamp = models.DateTimeField()
    source = models.CharField(max_length=20, choices=[('webhook', 'Webhook'), ('manual', 'Manual')], default='webhook')
    raw_data = models.JSONField(default=dict)  # Full webhook/API response
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['shipment', 'timestamp']),
            models.Index(fields=['carrier_tracking_number']),
        ]
    
    def __str__(self):
        return f"Tracking Update: {self.shipment.shipment_number} - {self.status}"


class PickupRequest(models.Model):
    """Pickup requests for workers to schedule and manage"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    shipment = models.OneToOneField(LogisticsShipment, on_delete=models.CASCADE, related_name='pickup_request')
    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='pickup_requests')
    
    # Pickup address
    pickup_address = models.JSONField(default=dict)  # Full address from shipment origin_address
    contact_name = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    special_instructions = models.TextField(blank=True)
    
    # Scheduling
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    scheduled_datetime = models.DateTimeField(null=True, blank=True)  # Combined for easier querying
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    pickup_attempts = models.IntegerField(default=0)
    last_attempt_date = models.DateTimeField(null=True, blank=True)
    
    # Completion details
    completed_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_to_warehouse_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Package details for pickup
    expected_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_dimensions = models.JSONField(default=dict)
    actual_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_dimensions = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_datetime']),
            models.Index(fields=['worker', 'status']),
            models.Index(fields=['shipment']),
        ]
    
    def __str__(self):
        return f"Pickup Request: {self.shipment.shipment_number} - {self.status}"
    
    def save(self, *args, **kwargs):
        from django.utils import timezone
        from django.db.models.signals import post_save
        
        # Track old status before saving
        old_status = None
        old_scheduled_datetime = None
        if self.pk:
            try:
                old_obj = PickupRequest.objects.get(pk=self.pk)
                old_status = old_obj.status
                old_scheduled_datetime = old_obj.scheduled_datetime
            except PickupRequest.DoesNotExist:
                pass
        
        # Auto-set scheduled_datetime if date and time are provided
        if self.scheduled_date and self.scheduled_time:
            import datetime
            self.scheduled_datetime = timezone.make_aware(
                datetime.datetime.combine(self.scheduled_date, self.scheduled_time)
            )
        
        super().save(*args, **kwargs)
        
        # Create tracking updates for status changes
        if self.shipment:
            # Status changed
            if old_status and old_status != self.status:
                status_messages = {
                    'pending': 'Pickup request created',
                    'scheduled': 'Pickup scheduled',
                    'in_progress': 'Pickup in progress',
                    'completed': 'Pickup completed',
                    'failed': 'Pickup failed',
                    'cancelled': 'Pickup cancelled',
                }
                
                TrackingUpdate.objects.create(
                    shipment=self.shipment,
                    status=self.status,
                    location=self.pickup_address.get('city', '') if self.pickup_address else '',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'pickup_request_id': self.id,
                        'old_status': old_status,
                        'new_status': self.status,
                        'status_message': status_messages.get(self.status, self.status),
                        'scheduled_datetime': self.scheduled_datetime.isoformat() if self.scheduled_datetime else None,
                        'worker': self.worker.email if self.worker else None,
                    }
                )
            
            # Scheduled datetime changed (rescheduled)
            if old_scheduled_datetime != self.scheduled_datetime and self.scheduled_datetime:
                if old_scheduled_datetime:  # Only create update if it was rescheduled (not first time)
                    TrackingUpdate.objects.create(
                        shipment=self.shipment,
                        status='pickup_rescheduled',
                        location=self.pickup_address.get('city', '') if self.pickup_address else '',
                        timestamp=timezone.now(),
                        source='manual',
                        raw_data={
                            'pickup_request_id': self.id,
                            'old_scheduled_datetime': old_scheduled_datetime.isoformat() if old_scheduled_datetime else None,
                            'new_scheduled_datetime': self.scheduled_datetime.isoformat(),
                            'worker': self.worker.email if self.worker else None,
                        }
                    )
                elif self.status == 'scheduled':  # First time scheduling
                    TrackingUpdate.objects.create(
                        shipment=self.shipment,
                        status='pickup_scheduled',
                        location=self.pickup_address.get('city', '') if self.pickup_address else '',
                        timestamp=timezone.now(),
                        source='manual',
                        raw_data={
                            'pickup_request_id': self.id,
                            'scheduled_datetime': self.scheduled_datetime.isoformat(),
                            'worker': self.worker.email if self.worker else None,
                        }
                    )


class Warehouse(models.Model):
    """YuuSell warehouses in different countries with category support"""
    SHIPPING_CATEGORIES = [
        ('small_parcel', 'Small Parcel (0-30kg)'),
        ('heavy_parcel', 'Heavy Parcel (30-100kg)'),
        ('ltl_freight', 'LTL Freight (100-4000kg)'),
        ('ftl_freight', 'FTL Freight (4000+kg)'),
        ('vehicle', 'Vehicle'),
        ('super_heavy', 'Super Heavy/Oversized'),
        ('all', 'All Categories'),
    ]
    
    name = models.CharField(max_length=200)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='warehouses')
    shipping_categories = models.JSONField(
        default=list,
        help_text="List of shipping categories this warehouse supports. Use ['all'] for all categories."
    )
    
    # Address fields
    full_name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, default='YuuSell Logistics Warehouse')
    street_address = models.CharField(max_length=255)
    street_address_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20)
    phone = models.CharField(max_length=20, blank=True)
    
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)  # Higher priority warehouses selected first
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', '-is_active', 'country', 'name']
        indexes = [
            models.Index(fields=['country', 'is_active']),
        ]
    
    def get_shipping_categories_display(self):
        """Get human-readable list of shipping categories"""
        if not self.shipping_categories:
            return 'None'
        if 'all' in self.shipping_categories:
            return 'All Categories'
        category_names = [dict(self.SHIPPING_CATEGORIES).get(cat, cat) for cat in self.shipping_categories]
        return ', '.join(category_names)
    
    def supports_category(self, category):
        """Check if warehouse supports a specific shipping category"""
        if not self.shipping_categories:
            return False
        return 'all' in self.shipping_categories or category in self.shipping_categories
    
    def __str__(self):
        return f"{self.name} ({self.country.code}) - {self.get_shipping_categories_display()}"


class PickupCalculationSettings(models.Model):
    """Admin-configurable pickup calculation settings by country, state, and category"""
    SHIPPING_CATEGORIES = [
        ('small_parcel', 'Small Parcel (0-30kg)'),
        ('heavy_parcel', 'Heavy Parcel (30-100kg)'),
        ('ltl_freight', 'LTL Freight (100-4000kg)'),
        ('ftl_freight', 'FTL Freight (4000+kg)'),
        ('vehicle', 'Vehicle'),
        ('super_heavy', 'Super Heavy/Oversized'),
        ('all', 'All Categories'),
    ]
    
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='pickup_settings')
    state = models.CharField(max_length=100, blank=True, help_text='State/Province (required for USA)')
    shipping_category = models.CharField(max_length=20, choices=SHIPPING_CATEGORIES, default='all')
    
    # Pricing structure
    base_pickup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=25.00, help_text='Base pickup fee')
    per_kg_rate = models.DecimalField(max_digits=10, decimal_places=4, default=0.50, help_text='Per kg rate')
    per_km_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.50, help_text='Per km rate (distance-based)')
    minimum_pickup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=15.00, help_text='Minimum pickup fee')
    
    # Global default fallback values (used when no settings found)
    is_global_fallback = models.BooleanField(
        default=False,
        help_text='If True, these values are used as fallback defaults when no specific settings are found'
    )
    
    # Dimensional weight settings
    dimensional_weight_divisor = models.DecimalField(max_digits=10, decimal_places=2, default=5000.00, help_text='Dimensional weight divisor (kg)')
    use_dimensional_weight = models.BooleanField(default=True, help_text='Use dimensional weight if greater than actual weight')
    
    # Additional fees
    residential_fee = models.DecimalField(max_digits=10, decimal_places=2, default=5.00, help_text='Additional fee for residential addresses')
    lift_gate_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text='Lift gate fee (for heavy items)')
    
    # Markup
    markup_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text='Markup percentage')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['country', 'state', 'shipping_category']
        ordering = ['country', 'state', 'shipping_category']
        indexes = [
            models.Index(fields=['country', 'state', 'shipping_category', 'is_active']),
        ]
    
    def __str__(self):
        location = f"{self.country.code}"
        if self.state:
            location += f" - {self.state}"
        category = self.get_shipping_category_display()
        return f"Pickup Settings: {location} ({category})"

