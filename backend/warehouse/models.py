from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from logistics.models import Package


class WarehouseReceiving(models.Model):
    """Inbound packages received at warehouse"""
    package = models.OneToOneField(Package, on_delete=models.CASCADE, related_name='warehouse_receiving')
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='received_packages')
    received_at = models.DateTimeField(auto_now_add=True)
    storage_location = models.CharField(max_length=50)
    inspection_notes = models.TextField(blank=True)
    damage_reported = models.BooleanField(default=False)
    prohibited_items_found = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Receiving: {self.package.reference_number}"


class WarehouseLabel(models.Model):
    """Prepaid shipping labels for warehouse inbound shipping"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generated', 'Label Generated'),
        ('printed', 'Printed'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered to Warehouse'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='warehouse_labels')
    label_number = models.CharField(max_length=100, unique=True)
    carrier = models.CharField(max_length=100)
    service_name = models.CharField(max_length=200)
    tracking_number = models.CharField(max_length=200)
    label_url = models.URLField(max_length=500)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Package details
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    dimensions = models.JSONField(default=dict)
    
    # Addresses
    pickup_address = models.JSONField(default=dict)
    warehouse_address = models.JSONField(default=dict)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    easyship_label_id = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.label_number} - {self.user.email}"


class PickupSchedule(models.Model):
    """Scheduled pickup requests for warehouse inbound shipping"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('scheduled', 'Scheduled'),
        ('picked_up', 'Picked Up'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pickup_schedules')
    pickup_number = models.CharField(max_length=100, unique=True)
    
    # Pickup details
    pickup_address = models.JSONField(default=dict)
    pickup_date = models.DateField()
    pickup_time_slot = models.CharField(max_length=50)  # e.g., "09:00-12:00"
    
    # Package details
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    dimensions = models.JSONField(default=dict)
    number_of_packages = models.IntegerField(default=1)
    
    # Contact info
    contact_name = models.CharField(max_length=200)
    contact_phone = models.CharField(max_length=50)
    special_instructions = models.TextField(blank=True)
    
    # Carrier and service
    carrier = models.CharField(max_length=100, blank=True)
    service_name = models.CharField(max_length=200, blank=True)
    easyship_pickup_id = models.CharField(max_length=200, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    tracking_number = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.pickup_number} - {self.user.email}"

