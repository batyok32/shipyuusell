from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.urls import reverse, path
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from .models import Vehicle, VehicleDocument


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'document_type', 'is_required', 'is_active', 'created_at']
    list_filter = ['document_type', 'is_required', 'is_active']
    search_fields = ['name', 'description']
    list_editable = ['is_active', 'is_required']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['vehicle_display', 'user_email', 'status_badge', 'shipping_method', 'total_amount', 'payment_paid', 'created_at']
    list_filter = ['status', 'vehicle_type', 'shipping_method', 'condition', 'payment_paid', 'created_at']
    search_fields = ['make', 'model', 'vin', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'inspection_photos_display', 'documents_signed_display', 'action_buttons']
    
    fieldsets = (
        ('Actions', {
            'fields': ('action_buttons',),
            'description': 'Quick actions for warehouse workers'
        }),
        ('Vehicle Information', {
            'fields': ('user', 'make', 'model', 'year', 'vin', 'vehicle_type', 'condition')
        }),
        ('Shipping Details', {
            'fields': ('shipping_method', 'status', 'origin_address', 'destination_address')
        }),
        ('Dimensions & Weight', {
            'fields': ('length', 'width', 'height', 'weight')
        }),
        ('Pricing', {
            'fields': ('quote_amount', 'pickup_cost', 'total_amount', 'payment_paid')
        }),
        ('Document Signing', {
            'fields': ('documents_signed_display', 'documents_signed', 'documents_signed_at')
        }),
        ('Inspection', {
            'fields': ('inspection_report', 'inspection_completed_at', 'inspected_by', 'inspection_photos_display')
        }),
        ('Inspection Photos (Upload)', {
            'fields': tuple([f'inspection_photo_{i}' for i in range(1, 21)]),
            'description': 'Upload inspection photos taken by pickup guy (up to 20 photos)',
            'classes': ('collapse',)
        }),
        ('Condition Report', {
            'fields': ('condition_report', 'condition_report_signed', 'condition_report_signed_at', 'condition_report_signature')
        }),
        ('Documentation', {
            'fields': ('export_documentation', 'customs_documentation'),
            'classes': ('collapse',)
        }),
        ('Warehouse Receiving', {
            'fields': ('received_at_warehouse_at', 'warehouse_receiving_notes'),
            'classes': ('collapse',)
        }),
        ('Linked Shipment', {
            'fields': ('shipment',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def vehicle_display(self, obj):
        return f"{obj.year} {obj.make} {obj.model}"
    vehicle_display.short_description = 'Vehicle'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'pending_documents': 'gray',
            'documents_signed': 'blue',
            'payment_pending': 'orange',
            'payment_received': 'green',
            'pickup_scheduled': 'purple',
            'inspection_pending': 'yellow',
            'inspection_completed': 'cyan',
            'condition_report_pending': 'teal',
            'condition_report_signed': 'lime',
            'in_transit_to_warehouse': 'indigo',
            'received_at_warehouse': 'pink',
            'in_transit': 'blue',
            'customs_clearance': 'amber',
            'out_for_delivery': 'orange',
            'delivered': 'green',
            'cancelled': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def inspection_photos_display(self, obj):
        """Display uploaded inspection photos"""
        photos_html = []
        for i in range(1, 21):
            photo = getattr(obj, f'inspection_photo_{i}', None)
            if photo:
                photos_html.append(
                    f'<img src="{photo.url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        # Show legacy JSONField photos
        if obj.inspection_photos:
            for photo_url in obj.inspection_photos[:20]:
                photos_html.append(
                    f'<img src="{photo_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        if photos_html:
            return format_html('<div style="display: flex; gap: 10px; flex-wrap: wrap;">{}</div>', ''.join(photos_html))
        return 'No photos'
    inspection_photos_display.short_description = 'Inspection Photos'
    
    def documents_signed_display(self, obj):
        """Display signed documents"""
        if not obj.documents_signed:
            return 'No documents signed'
        
        docs_html = []
        for doc_id, data in obj.documents_signed.items():
            try:
                doc = VehicleDocument.objects.get(id=doc_id)
                signed_at = data.get('signed_at', 'N/A')
                docs_html.append(f'<div><strong>{doc.name}</strong> - Signed: {signed_at}</div>')
            except VehicleDocument.DoesNotExist:
                docs_html.append(f'<div>Document ID {doc_id} (not found)</div>')
        
        return format_html('<div>{}</div>', ''.join(docs_html))
    documents_signed_display.short_description = 'Signed Documents'
    
    def action_buttons(self, obj):
        """Display action buttons for vehicle warehouse operations"""
        if not obj or not obj.pk:
            return '-'
        
        buttons = []
        
        # Received button - show if not already received
        if not obj.received_at_warehouse_at:
            received_url = reverse('admin:vehicles_vehicle_received', args=[obj.pk])
            buttons.append(
                format_html(
                    '<a href="{}" class="button" style="padding: 8px 16px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 8px; font-weight: bold;">📦 Received</a>',
                    received_url
                )
            )
        
        # Inspected button - show if received but not inspected
        if obj.received_at_warehouse_at and not obj.inspection_completed_at:
            inspected_url = reverse('admin:vehicles_vehicle_inspected', args=[obj.pk])
            buttons.append(
                format_html(
                    '<a href="{}" class="button" style="padding: 8px 16px; background: #17a2b8; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">✓ Inspected</a>',
                    inspected_url
                )
            )
        
        if not buttons:
            if obj.inspection_completed_at:
                return mark_safe('<span style="color: green;">✓ Received & Inspected</span>')
            return '-'
        
        buttons_html = ''.join(buttons)
        if buttons_html:
            return mark_safe(buttons_html)
        return '-'
    action_buttons.short_description = 'Quick Actions'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:vehicle_id>/received/', self.received_view, name='vehicles_vehicle_received'),
            path('<int:vehicle_id>/inspected/', self.inspected_view, name='vehicles_vehicle_inspected'),
        ]
        return custom_urls + urls
    
    def received_view(self, request, vehicle_id):
        """Handle received button click"""
        from logistics.models import TrackingUpdate
        
        vehicle = get_object_or_404(Vehicle, pk=vehicle_id)
        
        if vehicle.received_at_warehouse_at:
            messages.warning(request, 'This vehicle has already been marked as received.')
        else:
            vehicle.received_at_warehouse_at = timezone.now()
            vehicle.status = 'received_at_warehouse'
            vehicle.save()
            
            # Create tracking update
            if vehicle.shipment:
                TrackingUpdate.objects.create(
                    shipment=vehicle.shipment,
                    status='warehouse_received',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'vehicle_id': vehicle.id,
                        'received_at_warehouse_at': vehicle.received_at_warehouse_at.isoformat(),
                        'vehicle_make': vehicle.make,
                        'vehicle_model': vehicle.model,
                        'vehicle_year': vehicle.year,
                    }
                )
                # Update shipment status
                vehicle.shipment.status = 'processing'
                vehicle.shipment.save()
            
            messages.success(request, f'Vehicle marked as received at warehouse at {vehicle.received_at_warehouse_at.strftime("%Y-%m-%d %H:%M:%S")}.')
        
        return redirect(reverse('admin:vehicles_vehicle_change', args=[vehicle.id]))
    
    def inspected_view(self, request, vehicle_id):
        """Handle inspected button click"""
        from logistics.models import TrackingUpdate
        
        vehicle = get_object_or_404(Vehicle, pk=vehicle_id)
        
        if vehicle.inspection_completed_at:
            messages.warning(request, 'This vehicle has already been marked as inspected.')
        else:
            if not vehicle.received_at_warehouse_at:
                vehicle.received_at_warehouse_at = timezone.now()
            
            vehicle.inspection_completed_at = timezone.now()
            vehicle.status = 'inspection_completed'
            if not vehicle.inspected_by:
                vehicle.inspected_by = request.user
            vehicle.save()
            
            # Create tracking update
            if vehicle.shipment:
                TrackingUpdate.objects.create(
                    shipment=vehicle.shipment,
                    status='inspection_completed',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'vehicle_id': vehicle.id,
                        'inspection_completed_at': vehicle.inspection_completed_at.isoformat(),
                        'inspected_by': vehicle.inspected_by.email if vehicle.inspected_by else None,
                        'vehicle_make': vehicle.make,
                        'vehicle_model': vehicle.model,
                        'vehicle_year': vehicle.year,
                    }
                )
            
            messages.success(request, f'Vehicle marked as inspected at {vehicle.inspection_completed_at.strftime("%Y-%m-%d %H:%M:%S")}.')
        
        return redirect(reverse('admin:vehicles_vehicle_change', args=[vehicle.id]))

