from django.db import models
from django.conf import settings
import uuid


class Payment(models.Model):
    """Payment records"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_TYPES = [
        ('shipping', 'Shipping'),
        ('quote', 'Shipping Quote'),
        ('buy_and_ship_quote', 'Buy & Ship Quote'),
        ('buying_service', 'Buying Service'),  # Legacy - kept for backward compatibility
        ('vehicle_deposit', 'Vehicle Deposit'),  # Legacy - kept for backward compatibility
        ('vehicle_shipping', 'Vehicle Shipping'),
        ('warehouse_label', 'Warehouse Label'),
        ('storage', 'Storage Fee'),
        ('insurance', 'Insurance'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    payment_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_checkout_session_id = models.CharField(max_length=200, blank=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    payment_type = models.CharField(max_length=30, choices=PAYMENT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related objects
    shipment = models.ForeignKey('logistics.LogisticsShipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    buying_request = models.ForeignKey('buying.BuyingRequest', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.payment_id} - {self.amount} {self.currency}"

