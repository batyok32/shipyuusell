from django.db import models
from django.conf import settings
import uuid


class VehicleDocument(models.Model):
    """Documents that need to be signed before vehicle payment"""
    DOCUMENT_TYPES = [
        ('shipping_agreement', 'Shipping Agreement'),
        ('export_declaration', 'Export Declaration'),
        ('power_of_attorney', 'Power of Attorney'),
        ('customs_declaration', 'Customs Declaration'),
        ('insurance_waiver', 'Insurance Waiver'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=200, help_text="Document name/title")
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='vehicle_documents/', help_text="PDF or document file")
    description = models.TextField(blank=True, help_text="Description of what this document is for")
    is_required = models.BooleanField(default=True, help_text="Must be signed before payment")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['is_required', 'document_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_document_type_display()})"


class Vehicle(models.Model):
    """Vehicle shipping requests"""
    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('motorcycle', 'Motorcycle'),
        ('boat', 'Boat'),
        ('rv', 'RV/Camper'),
        ('truck', 'Truck'),
        ('other', 'Other'),
    ]
    
    SHIPPING_METHODS = [
        ('roro', 'RoRo (Roll-on/Roll-off)'),
        ('container_20ft', '20ft Container'),
        ('container_40ft', '40ft Container'),
        ('container_shared', 'Shared Container'),
    ]
    
    CONDITION_CHOICES = [
        ('running', 'Running'),
        ('non_running', 'Non-Running'),
    ]
    
    STATUS_CHOICES = [
        ('pending_documents', 'Pending Document Signing'),
        ('documents_signed', 'Documents Signed'),
        ('payment_pending', 'Payment Pending'),
        ('payment_received', 'Payment Received'),
        ('pickup_scheduled', 'Pickup Scheduled'),
        ('inspection_pending', 'Inspection Pending'),
        ('inspection_completed', 'Inspection Completed'),
        ('condition_report_pending', 'Condition Report Pending'),
        ('condition_report_signed', 'Condition Report Signed'),
        ('in_transit_to_warehouse', 'In Transit to Warehouse'),
        ('received_at_warehouse', 'Received at Warehouse'),
        ('in_transit', 'In Transit'),
        ('customs_clearance', 'Customs Clearance'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vehicles')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_documents')
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    vin = models.CharField(max_length=50, blank=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    shipping_method = models.CharField(max_length=20, choices=SHIPPING_METHODS)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    
    # Dimensions
    length = models.DecimalField(max_digits=10, decimal_places=2)  # cm
    width = models.DecimalField(max_digits=10, decimal_places=2)  # cm
    height = models.DecimalField(max_digits=10, decimal_places=2)  # cm
    weight = models.DecimalField(max_digits=10, decimal_places=2)  # kg
    
    # Addresses
    origin_address = models.JSONField(default=dict, help_text="Pickup address")
    destination_address = models.JSONField(default=dict, help_text="Delivery address")
    
    # Pricing
    quote_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pickup_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost for pickup from origin")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total amount (quote + pickup)")
    payment_paid = models.BooleanField(default=False)
    
    # Document Signing (before payment)
    documents_signed = models.JSONField(default=dict, help_text="Signed documents: {document_id: signed_at, signature_data}")
    documents_signed_at = models.DateTimeField(null=True, blank=True)
    
    # Inspection (by pickup guy)
    inspection_report = models.JSONField(default=dict, help_text="15-point checklist and notes")
    inspection_completed_at = models.DateTimeField(null=True, blank=True)
    inspected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspected_vehicles')
    
    # Inspection Photos (uploaded by pickup guy)
    inspection_photo_1 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_2 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_3 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_4 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_5 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_6 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_7 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_8 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_9 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_10 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_11 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_12 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_13 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_14 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_15 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_16 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_17 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_18 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_19 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    inspection_photo_20 = models.ImageField(upload_to='vehicles/inspection/', blank=True, null=True)
    
    # Legacy: Keep JSONField for backward compatibility
    inspection_photos = models.JSONField(default=list, blank=True, help_text="Legacy: List of photo URLs")
    
    # Condition Report
    condition_report = models.FileField(upload_to='vehicles/condition_reports/', blank=True, null=True, help_text="Generated condition report PDF")
    condition_report_signed = models.BooleanField(default=False)
    condition_report_signed_at = models.DateTimeField(null=True, blank=True)
    condition_report_signature = models.JSONField(default=dict, blank=True, help_text="Digital signature data")
    
    # Documentation
    export_documentation = models.JSONField(default=dict, help_text="Export paperwork and documents")
    customs_documentation = models.JSONField(default=dict, help_text="Customs paperwork and documents")
    
    # Warehouse Receiving
    received_at_warehouse_at = models.DateTimeField(null=True, blank=True)
    warehouse_receiving_notes = models.TextField(blank=True)
    
    # Linked shipment
    shipment = models.OneToOneField('logistics.LogisticsShipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicle')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.year} {self.make} {self.model} - {self.user.email}"

