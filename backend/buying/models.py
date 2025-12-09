from django.db import models
from django.conf import settings
from decimal import Decimal
import random
import string
from datetime import datetime


def generate_reference_number():
    """Generate unique reference number: BS-YYYYMMDD-XXXXXX"""
    prefix = 'BS'
    date_str = datetime.now().strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{date_str}-{random_str}"


class BuyingRequest(models.Model):
    """Buy & Ship service requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('quoted', 'Quoted'),
        ('quote_approved', 'Quote Approved'),
        ('payment_pending', 'Payment Pending'),
        ('payment_received', 'Payment Received'),
        ('purchasing', 'Purchasing'),
        ('purchased', 'Purchased'),
        ('in_transit_to_warehouse', 'In Transit to Warehouse'),
        ('received_at_warehouse', 'Received at Warehouse'),
        ('ready_to_ship', 'Ready to Ship'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buying_requests')
    product_url = models.URLField(max_length=1000, blank=True, null=True)
    product_description = models.TextField()
    product_name = models.CharField(max_length=500, blank=True, null=True)
    product_image = models.URLField(max_length=1000, blank=True, null=True)
    max_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Shipping address
    shipping_address = models.JSONField(default=dict, help_text="User's shipping address")
    
    # Approximate quote data (for immediate quote if user provides size/price)
    approximate_quote_data = models.JSONField(default=dict, blank=True, help_text="Stores approximate quote if user provided size/price")
    
    # Reference number (generated when agent marks as purchased)
    reference_number = models.CharField(max_length=50, unique=True, null=True, blank=True, help_text="Reference number for warehouse identification")
    
    # Purchase details
    purchase_receipt = models.URLField(max_length=1000, blank=True)
    purchase_tracking = models.CharField(max_length=200, blank=True)
    purchase_date = models.DateTimeField(null=True, blank=True)
    
    # Linked package when received
    package = models.OneToOneField('logistics.Package', on_delete=models.SET_NULL, null=True, blank=True, related_name='buying_request')
    
    # Linked shipment
    shipment = models.ForeignKey('logistics.LogisticsShipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='buying_requests')
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['reference_number']),
        ]
    
    def __str__(self):
        return f"Buying Request: {self.product_name or self.product_description[:50]} - {self.user.email}"
    
    def generate_reference_number(self):
        """Generate and set reference number"""
        if not self.reference_number:
            while True:
                ref_num = generate_reference_number()
                if not BuyingRequest.objects.filter(reference_number=ref_num).exists():
                    self.reference_number = ref_num
                    break
        return self.reference_number


class BuyAndShipQuote(models.Model):
    """Multiple quotes per buying request with different shipping options"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]
    
    buying_request = models.ForeignKey(BuyingRequest, on_delete=models.CASCADE, related_name='quotes')
    
    # Product costs
    product_cost = models.DecimalField(max_digits=10, decimal_places=2)
    sales_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    buying_service_fee = models.DecimalField(max_digits=10, decimal_places=2)
    buying_service_fee_percent = models.DecimalField(max_digits=5, decimal_places=2)
    domestic_shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Shipping option
    shipping_mode = models.ForeignKey('logistics.TransportMode', on_delete=models.SET_NULL, null=True, blank=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_service_name = models.CharField(max_length=200, blank=True)
    estimated_delivery_days = models.IntegerField(null=True, blank=True)
    
    # Total
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Linked shipment when approved
    shipment = models.OneToOneField('logistics.LogisticsShipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='buy_and_ship_quote')
    
    # Store full quote data for shipment creation (easyship_rate_id, etc.)
    quote_data = models.JSONField(default=dict, blank=True, help_text="Stores full quote data including easyship_rate_id for shipment creation")
    
    # Notes
    notes = models.TextField(blank=True, help_text="Agent notes or adjustments")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buying_request', 'status']),
        ]
    
    def __str__(self):
        return f"Quote #{self.id} - {self.buying_request.product_name or 'Product'} - {self.total_cost} ({self.status})"

