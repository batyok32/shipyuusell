from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.utils.safestring import mark_safe
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from django import forms
from .models import (
    Country, TransportMode, ShippingRoute, Package, 
    LogisticsShipment, ShippingCalculationSettings,
    QuoteRequest, TrackingUpdate, PickupRequest, Warehouse, PickupCalculationSettings
)
from buying.models import BuyingRequest
from warehouse.models import WarehouseReceiving


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'continent', 'customs_required', 'color_indicator']
    search_fields = ['name', 'code']
    list_filter = ['continent', 'customs_required']
    
    def color_indicator(self, obj):
        if obj is None:
            return '-'
        if obj.customs_required:
            return mark_safe('<span style="color: green;">✓ Required</span>')
        return mark_safe('<span style="color: orange;">⚠ Not Required</span>')
    color_indicator.short_description = 'Customs Status'


class ShippingCalculationSettingsInline(admin.TabularInline):
    model = ShippingCalculationSettings
    extra = 1
    fields = ('transport_mode', 'shipping_categories', 'base_rate', 'per_kg_rate', 'fuel_surcharge_percent', 
              'security_fee', 'handling_fee', 'is_global_default')
    readonly_fields = []
    fk_name = 'route'


@admin.register(TransportMode)
class TransportModeAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'transit_days_display', 'is_active', 'mode_icon']
    list_filter = ['type', 'is_active']
    search_fields = ['name', 'type']
    
    def transit_days_display(self, obj):
        return f"{obj.transit_days_min}-{obj.transit_days_max} days"
    transit_days_display.short_description = 'Transit Time'
    
    def mode_icon(self, obj):
        icons = {
            'air': '✈️',
            'sea': '🚢',
            'rail': '🚂',
            'truck': '🚛'
        }
        return icons.get(obj.type, '📦')
    mode_icon.short_description = 'Icon'


@admin.register(ShippingRoute)
class ShippingRouteAdmin(admin.ModelAdmin):
    list_display = ['route_display', 'transport_mode', 'is_available', 'pickup_available', 'local_shipping_only', 'priority', 'calculation_settings_count']
    list_filter = ['is_available', 'pickup_available', 'local_shipping_only', 'transport_mode', 'origin_country', 'destination_country']
    search_fields = ['origin_country__name', 'destination_country__name', 'carrier']
    list_editable = ['is_available', 'pickup_available', 'local_shipping_only', 'priority']
    inlines = [ShippingCalculationSettingsInline]
    
    def route_display(self, obj):
        return format_html(
            '<strong>{} → {}</strong>',
            obj.origin_country.code,
            obj.destination_country.code
        )
    route_display.short_description = 'Route'
    
    def calculation_settings_count(self, obj):
        count = obj.calculation_settings.count()
        url = reverse('admin:logistics_shippingcalculationsettings_changelist')
        return format_html(
            '<a href="{}?route__id__exact={}">{} Calculation Settings</a>',
            url,
            obj.id,
            count
        )
    calculation_settings_count.short_description = 'Calculation Settings'


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'user_email', 'status_badge', 'weight', 'dimensions_display', 'received_date', 'status_actions']
    list_filter = ['status', 'received_date']
    search_fields = ['reference_number', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'photos_display', 'delivery_photos_display', 'status_actions']
    
    def receive_link(self, obj):
        """Quick link to receive package page"""
        if not obj or not obj.pk:
            return '-'
        
        if obj.status == 'received':
            return mark_safe('<span style="color: green;">✓ Received</span>')
        
        try:
            url = reverse('admin:logistics_package_receive', args=[obj.pk])
        except Exception:
            # Fallback if URL reverse fails
            url = f'/admin/logistics/package/receive-package/{obj.pk}/'
        
        return format_html(
            '<a href="{}" class="button" style="padding: 5px 10px; background: #417690; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer;">📦 Receive</a>',
            url
        )
    receive_link.short_description = 'Actions'
    
    def status_actions(self, obj):
        """Display status action buttons based on current status"""
        if not obj or not obj.pk:
            return '-'
        
        buttons = []
        
        # Status flow: pending -> received -> inspected -> ready -> in_transit -> delivered
        if obj.status == 'pending':
            # Show "Mark as Received" button
            try:
                url = reverse('admin:logistics_package_receive', args=[obj.pk])
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #417690; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">📦 Received</a>',
                        url
                    )
                )
            except Exception:
                url = f'/admin/logistics/package/receive-package/{obj.pk}/'
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #417690; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">📦 Received</a>',
                        url
                    )
                )
        
        elif obj.status == 'received':
            # Show "Mark as Inspected" button
            try:
                url = reverse('admin:logistics_package_inspected', args=[obj.pk])
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #7c3aed; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">✓ Inspected</a>',
                        url
                    )
                )
            except Exception:
                url = f'/admin/logistics/package/{obj.pk}/mark-inspected/'
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #7c3aed; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">✓ Inspected</a>',
                        url
                    )
                )
        
        elif obj.status == 'inspected':
            # Show "Mark as Ready to Ship" button
            try:
                url = reverse('admin:logistics_package_ready', args=[obj.pk])
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">🚀 Ready to Ship</a>',
                        url
                    )
                )
            except Exception:
                url = f'/admin/logistics/package/{obj.pk}/mark-ready/'
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">🚀 Ready to Ship</a>',
                        url
                    )
                )
        
        elif obj.status == 'ready':
            # Show "Mark as In Transit" button
            try:
                url = reverse('admin:logistics_package_in_transit', args=[obj.pk])
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">🚚 In Transit</a>',
                        url
                    )
                )
            except Exception:
                url = f'/admin/logistics/package/{obj.pk}/mark-in-transit/'
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">🚚 In Transit</a>',
                        url
                    )
                )
        
        elif obj.status == 'in_transit':
            # Show "Mark as Delivered" button (needs photo upload)
            try:
                url = reverse('admin:logistics_package_delivered', args=[obj.pk])
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #059669; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">✅ Delivered</a>',
                        url
                    )
                )
            except Exception:
                url = f'/admin/logistics/package/{obj.pk}/mark-delivered/'
                buttons.append(
                    format_html(
                        '<a href="{}" class="button" style="padding: 5px 10px; background: #059669; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 11px; cursor: pointer; margin-right: 5px;">✅ Delivered</a>',
                        url
                    )
                )
        
        elif obj.status == 'delivered':
            return mark_safe('<span style="color: green; font-weight: bold;">✓ Delivered</span>')
        
        if buttons:
            return mark_safe(''.join(buttons))
        return '-'
    status_actions.short_description = 'Status Actions'
    
    fieldsets = (
        ('Quick Actions', {
            'fields': ('status_actions',),
            'description': 'Quick status change actions'
        }),
        ('Package Information', {
            'fields': ('user', 'reference_number', 'tracking_number', 'status', 'shipment')
        }),
        ('Dimensions & Weight', {
            'fields': ('weight', 'length', 'width', 'height', 'declared_value')
        }),
        ('Warehouse Details', {
            'fields': ('received_date', 'storage_expiry_date', 'storage_location')
        }),
        ('Inbound Photos (Upload)', {
            'fields': ('photo_1', 'photo_2', 'photo_3', 'photo_4', 'photo_5'),
            'description': 'Upload photos taken when package was received at warehouse (up to 5 photos)'
        }),
        ('Inbound Photos (Legacy URLs)', {
            'fields': ('photos_display', 'photos'),
            'description': 'Legacy: Photo URLs from external sources (for backward compatibility)',
            'classes': ('collapse',)
        }),
        ('Delivery Photos (Upload)', {
            'fields': ('delivery_photo_1', 'delivery_photo_2', 'delivery_photo_3', 'delivery_photo_4', 'delivery_photo_5'),
            'description': 'Upload photos taken when package was delivered to user (up to 5 photos)'
        }),
        ('Delivery Photos (Legacy URLs)', {
            'fields': ('delivery_photos_display', 'delivery_photos'),
            'description': 'Legacy: Delivery photo URLs (for backward compatibility)',
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('description', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'gray',
            'received': 'blue',
            'inspected': 'purple',
            'ready': 'green',
            'in_transit': 'orange',
            'delivered': 'green',
            'returned': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">{}</span>',
            color,
            obj.status.replace('_', ' ')
        )
    status_badge.short_description = 'Status'
    
    def dimensions_display(self, obj):
        if obj.length and obj.width and obj.height:
            return f"{obj.length}×{obj.width}×{obj.height} cm"
        return '-'
    dimensions_display.short_description = 'Dimensions'
    
    def photos_display(self, obj):
        """Display uploaded photos and legacy URL photos"""
        photos_html = []
        
        # Show uploaded photos first
        for i in range(1, 6):
            photo = getattr(obj, f'photo_{i}', None)
            if photo:
                photos_html.append(
                    f'<img src="{photo.url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        # Show legacy URL photos
        if obj.photos:
            for photo_url in obj.photos[:5]:
                photos_html.append(
                    f'<img src="{photo_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        if photos_html:
            return format_html('<div style="display: flex; gap: 10px; flex-wrap: wrap;">{}</div>', ''.join(photos_html))
        return 'No photos'
    photos_display.short_description = 'Inbound Photos (All)'
    
    def delivery_photos_display(self, obj):
        """Display uploaded delivery photos and legacy URL photos"""
        photos_html = []
        
        # Show uploaded photos first
        for i in range(1, 6):
            photo = getattr(obj, f'delivery_photo_{i}', None)
            if photo:
                photos_html.append(
                    f'<img src="{photo.url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        # Show legacy URL photos
        if obj.delivery_photos:
            for photo_url in obj.delivery_photos[:5]:
                photos_html.append(
                    f'<img src="{photo_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin: 5px;" />'
                )
        
        if photos_html:
            return format_html('<div style="display: flex; gap: 10px; flex-wrap: wrap;">{}</div>', ''.join(photos_html))
        return 'No delivery photos'
    delivery_photos_display.short_description = 'Delivery Photos (All)'
    
    def save_model(self, request, obj, form, change):
        """Send email when package is marked as delivered with photos"""
        if change and obj.status == 'delivered':
            # Check if this is a new delivery (status changed to delivered)
            old_obj = Package.objects.get(pk=obj.pk) if obj.pk else None
            if old_obj and old_obj.status != 'delivered':
                # Check if there are delivery photos (uploaded or legacy URLs)
                has_delivery_photos = False
                for i in range(1, 6):
                    if getattr(obj, f'delivery_photo_{i}', None):
                        has_delivery_photos = True
                        break
                if not has_delivery_photos and obj.delivery_photos:
                    has_delivery_photos = True
                
                if has_delivery_photos:
                    # Package just got delivered, send email
                    try:
                        from buying.models import BuyingRequest
                        buying_request = BuyingRequest.objects.filter(package=obj).first()
                        if buying_request:
                            from buying.services.email_service import send_delivered_user_email
                            send_delivered_user_email(buying_request)
                    except Exception as e:
                        pass
        
        super().save_model(request, obj, form, change)
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('receive-package/<int:package_id>/', self.receive_package_view, name='logistics_package_receive'),
            path('receive-package/', self.receive_package_view, name='logistics_package_receive_search'),  # Keep for backward compatibility
            path('<int:package_id>/mark-inspected/', self.mark_inspected_view, name='logistics_package_inspected'),
            path('<int:package_id>/mark-ready/', self.mark_ready_view, name='logistics_package_ready'),
            path('<int:package_id>/mark-in-transit/', self.mark_in_transit_view, name='logistics_package_in_transit'),
            path('<int:package_id>/mark-delivered/', self.mark_delivered_view, name='logistics_package_delivered'),
        ]
        return custom_urls + urls
    
    def receive_package_view(self, request, package_id=None):
        """Custom admin view for receiving packages by package ID or reference number"""
        from decimal import Decimal
        from logistics.services.easyship_service import EasyShipService
        from logistics.services.pricing_calculator import PricingCalculator
        
        context = {
            'title': 'Receive Package at Warehouse',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
        }
        
        package = None
        buying_request = None
        error = None
        
        # If package_id is provided, get package directly
        if package_id:
            try:
                package = Package.objects.get(pk=package_id)
                # Find associated buying request
                if package.shipment:
                    from buying.models import BuyAndShipQuote
                    quote = BuyAndShipQuote.objects.filter(shipment=package.shipment).first()
                    if quote:
                        buying_request = quote.buying_request
                if not buying_request:
                    buying_request = BuyingRequest.objects.filter(package=package).first()
            except Package.DoesNotExist:
                error = f"Package with ID {package_id} not found"
                messages.error(request, error)
                return redirect('admin:logistics_package_changelist')
        
        # Fallback to reference number search (for backward compatibility)
        reference_number = request.GET.get('ref', '') or request.POST.get('reference_number', '')
        
        # Search for package or buying request by reference number (only if package_id not provided)
        if not package and reference_number:
            # Check if it's a Package reference (PKG- prefix) or BuyingRequest reference (BS- prefix)
            if reference_number.startswith('PKG-'):
                # It's a Package reference number
                try:
                    package = Package.objects.get(reference_number=reference_number)
                    # Try to find associated buying request through shipment or direct link
                    if package.shipment:
                        # Check if shipment is linked to a buying request
                        from buying.models import BuyAndShipQuote
                        quote = BuyAndShipQuote.objects.filter(shipment=package.shipment).first()
                        if quote:
                            buying_request = quote.buying_request
                    # Also check if package is directly linked to buying request
                    if not buying_request:
                        buying_request = BuyingRequest.objects.filter(package=package).first()
                except Package.DoesNotExist:
                    error = f"No package found with reference number: {reference_number}"
            elif reference_number.startswith('BS-'):
                # It's a BuyingRequest reference number
                try:
                    buying_request = BuyingRequest.objects.get(reference_number=reference_number)
                    # Try to find associated package
                    try:
                        package = Package.objects.get(reference_number=reference_number)
                    except Package.DoesNotExist:
                        # Package might not exist yet - will be created on receive
                        # But also check if package is linked via shipment
                        if buying_request.shipment:
                            package = Package.objects.filter(shipment=buying_request.shipment).first()
                except BuyingRequest.DoesNotExist:
                    error = f"No buying request found with reference number: {reference_number}"
            else:
                # Try both (for backward compatibility)
                try:
                    buying_request = BuyingRequest.objects.get(reference_number=reference_number)
                    try:
                        package = Package.objects.get(reference_number=reference_number)
                    except Package.DoesNotExist:
                        pass
                except BuyingRequest.DoesNotExist:
                    try:
                        package = Package.objects.get(reference_number=reference_number)
                        if package.shipment:
                            from buying.models import BuyAndShipQuote
                            quote = BuyAndShipQuote.objects.filter(shipment=package.shipment).first()
                            if quote:
                                buying_request = quote.buying_request
                    except Package.DoesNotExist:
                        error = f"No buying request or package found with reference number: {reference_number}"
        
        # Handle form submission
        if request.method == 'POST' and 'receive_package' in request.POST:
            # If package_id was provided, use it; otherwise use reference_number from form
            if package_id and package:
                reference_number = package.reference_number
            else:
                reference_number = request.POST.get('reference_number')
            weight = request.POST.get('weight')
            length = request.POST.get('length')
            width = request.POST.get('width')
            height = request.POST.get('height')
            tracking_number = request.POST.get('tracking_number', '')
            storage_location = request.POST.get('storage_location', '')
            description = request.POST.get('description', '')
            damage_reported = 'damage_reported' in request.POST
            prohibited_items_found = 'prohibited_items_found' in request.POST
            
            # If we already have package from package_id, skip search
            if not package:
                if not reference_number:
                    messages.error(request, 'Reference number is required')
                    if package_id:
                        return redirect('admin:logistics_package_receive', package_id)
                    return redirect('admin:logistics_package_receive_search')
                
                # Find package or buying request by reference number (only if package_id not provided)
                if reference_number.startswith('PKG-'):
                    # It's a Package reference
                    try:
                        package = Package.objects.get(reference_number=reference_number)
                        # Find associated buying request
                        if package.shipment:
                            from buying.models import BuyAndShipQuote
                            quote = BuyAndShipQuote.objects.filter(shipment=package.shipment).first()
                            if quote:
                                buying_request = quote.buying_request
                        if not buying_request:
                            buying_request = BuyingRequest.objects.filter(package=package).first()
                    except Package.DoesNotExist:
                        messages.error(request, f'Package not found with reference number: {reference_number}')
                        if package_id:
                            return redirect('admin:logistics_package_receive', package_id)
                        return redirect('admin:logistics_package_receive_search')
                elif reference_number.startswith('BS-'):
                    # It's a BuyingRequest reference
                    try:
                        buying_request = BuyingRequest.objects.get(reference_number=reference_number)
                        # Find associated package
                        try:
                            package = Package.objects.get(reference_number=reference_number)
                        except Package.DoesNotExist:
                            if buying_request.shipment:
                                package = Package.objects.filter(shipment=buying_request.shipment).first()
                    except BuyingRequest.DoesNotExist:
                        messages.error(request, f'Buying request not found with reference number: {reference_number}')
                        if package_id:
                            return redirect('admin:logistics_package_receive', package_id)
                        return redirect('admin:logistics_package_receive_search')
                else:
                    # Try both (backward compatibility)
                    try:
                        buying_request = BuyingRequest.objects.get(reference_number=reference_number)
                        try:
                            package = Package.objects.get(reference_number=reference_number)
                        except Package.DoesNotExist:
                            if buying_request.shipment:
                                package = Package.objects.filter(shipment=buying_request.shipment).first()
                    except BuyingRequest.DoesNotExist:
                        try:
                            package = Package.objects.get(reference_number=reference_number)
                            if package.shipment:
                                from buying.models import BuyAndShipQuote
                                quote = BuyAndShipQuote.objects.filter(shipment=package.shipment).first()
                                if quote:
                                    buying_request = quote.buying_request
                        except Package.DoesNotExist:
                            messages.error(request, f'No buying request or package found with reference number: {reference_number}')
                            if package_id:
                                return redirect('admin:logistics_package_receive', package_id)
                            return redirect('admin:logistics_package_receive_search')
            
            # If we have a package but no buying request, we can still process it
            if package and not buying_request:
                # Package exists but no buying request - update package directly
                pass
            elif not buying_request:
                messages.error(request, f'Could not find associated buying request for reference number: {reference_number}')
                return redirect('admin:logistics_package_receive')
            
            # Validate required fields
            if not weight or not length or not width or not height or not storage_location:
                messages.error(request, 'Weight, dimensions, and storage location are required')
                context['reference_number'] = reference_number or (package.reference_number if package else '')
                context['buying_request'] = buying_request
                context['package'] = package
                context['package_id'] = package_id
                return render(request, 'admin/logistics/package/receive_package.html', context)
            
            dimensions = {
                'length': float(length),
                'width': float(width),
                'height': float(height)
            }
            
            # Get or create package (use existing package if found, otherwise create new)
            # If we already have package from package_id, use it; otherwise try to find by reference_number
            if not package:
                try:
                    package = Package.objects.get(reference_number=reference_number)
                except Package.DoesNotExist:
                    package = None
            
            if package:
                # Update existing package
                # Update existing package
                package.weight = Decimal(str(weight))
                package.length = Decimal(str(length))
                package.width = Decimal(str(width))
                package.height = Decimal(str(height))
                package.tracking_number = tracking_number
                package.storage_location = storage_location
                package.description = description
                package.received_date = timezone.now()
                package.status = 'received'
                
                # Handle photo uploads
                for i in range(1, 6):
                    photo_field = f'photo_{i}'
                    if photo_field in request.FILES:
                        setattr(package, photo_field, request.FILES[photo_field])
                
                package.save()
            else:
                # Create new package (only if we have a buying request)
                if buying_request:
                    package = Package.objects.create(
                        reference_number=reference_number if reference_number.startswith('PKG-') else buying_request.reference_number,
                        user=buying_request.user,
                        tracking_number=tracking_number,
                        weight=Decimal(str(weight)),
                        length=Decimal(str(length)),
                        width=Decimal(str(width)),
                        height=Decimal(str(height)),
                        received_date=timezone.now(),
                        storage_location=storage_location,
                        description=description,
                        status='received',
                        declared_value=buying_request.approximate_quote_data.get('declared_value', 0) if buying_request.approximate_quote_data else 0,
                    )
                    
                    # Handle photo uploads
                    for i in range(1, 6):
                        photo_field = f'photo_{i}'
                        if photo_field in request.FILES:
                            setattr(package, photo_field, request.FILES[photo_field])
                            package.save()
                else:
                    messages.error(request, 'Cannot create package without buying request')
                    if package_id:
                        return redirect('admin:logistics_package_receive', package_id)
                    return redirect('admin:logistics_package_receive_search')
            
            # Link package to buying request if we have one
            if buying_request:
                buying_request.package = package
                buying_request.status = 'received_at_warehouse'
                buying_request.save()
            
            # Create or update warehouse receiving record
            receiving, created = WarehouseReceiving.objects.get_or_create(
                package=package,
                defaults={
                    'received_by': request.user,
                    'storage_location': storage_location,
                    'inspection_notes': description,
                    'damage_reported': damage_reported,
                    'prohibited_items_found': prohibited_items_found,
                }
            )
            if not created:
                receiving.storage_location = storage_location
                receiving.inspection_notes = description
                receiving.damage_reported = damage_reported
                receiving.prohibited_items_found = prohibited_items_found
                receiving.save()
            
            # Update shipment if exists
            if buying_request and buying_request.shipment and buying_request.shipment.status == 'payment_received':
                shipment = buying_request.shipment
                
                # Update shipment with actual weight and dimensions
                shipment.actual_weight = Decimal(str(weight))
                calculator = PricingCalculator()
                dim_weight = calculator.calculate_dimensional_weight(
                    dimensions['length'],
                    dimensions['width'],
                    dimensions['height'],
                    5000
                )
                shipment.chargeable_weight = max(Decimal(str(weight)), dim_weight)
                
                # Update dimensions in origin_address
                origin_address = shipment.origin_address.copy()
                origin_address['dimensions'] = dimensions
                shipment.origin_address = origin_address
                
                # Update volume
                length_m = Decimal(str(dimensions['length'])) / Decimal('100')
                width_m = Decimal(str(dimensions['width'])) / Decimal('100')
                height_m = Decimal(str(dimensions['height'])) / Decimal('100')
                shipment.actual_volume = length_m * width_m * height_m
                
                shipment.status = 'ready_to_ship'
                shipment.save()
                
                # Link package to shipment
                shipment.packages.add(package)
                package.shipment = shipment
                package.save()
                
                # Try to generate label if easyship_rate_id is available and shipment is paid
                from payments.models import Payment
                is_paid = Payment.objects.filter(shipment=shipment, status='completed').exists()
                easyship_rate_id = origin_address.get('easyship_rate_id')
                if not is_paid:
                    messages.warning(request, 'Package received, but payment is required before generating shipping label. Please ensure payment is completed first.')
                elif easyship_rate_id:
                    try:
                        easyship = EasyShipService()
                        
                        parcels = [{
                            'total_actual_weight': float(shipment.actual_weight),
                            'box': {
                                'length': float(dimensions['length']),
                                'width': float(dimensions['width']),
                                'height': float(dimensions['height']),
                            },
                            'items': [{
                                'description': origin_address.get('description', buying_request.product_name or 'General Merchandise'),
                                'hs_code': '999999',
                                'sku': 'BS',
                                'quantity': 1,
                                'declared_customs_value': float(origin_address.get('declared_value', buying_request.approximate_quote_data.get('declared_value', 0) if buying_request.approximate_quote_data else 0)),
                                'declared_currency': 'USD',
                            }]
                        }]
                        
                        warehouse_address = calculator.get_warehouse_address('US', shipment.shipping_category)
                        if not warehouse_address:
                            warehouse_address = {
                                'full_name': 'YuuSell Logistics Warehouse',
                                'street_address': '123 Warehouse St',
                                'city': 'Los Angeles',
                                'state_province': 'CA',
                                'postal_code': '90001',
                                'country': 'US',
                                'phone': '+1-555-123-4567',
                                'email': 'warehouse@logistics.yuusell.com'
                            }
                        
                        easyship_result = easyship.create_shipment(
                            rate_id=easyship_rate_id,
                            origin_address=warehouse_address,
                            destination_address=shipment.destination_address,
                            parcels=parcels
                        )
                        
                        if easyship_result:
                            shipment.easyship_shipment_id = easyship_result.get('shipment_id', '')
                            shipment.tracking_number = easyship_result.get('tracking_number', '')
                            shipment.local_carrier_tracking_number = easyship_result.get('tracking_number', '')
                            shipment.easyship_label_url = easyship_result.get('label_url', '')
                            shipment.status = 'processing'
                            shipment.save()
                            
                            buying_request.status = 'ready_to_ship'
                            buying_request.save()
                            messages.success(request, f'Package received! Shipping label generated. Tracking: {shipment.tracking_number}')
                        else:
                            messages.warning(request, 'Package received, but label generation failed. Please generate manually.')
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error generating label: {str(e)}")
                        messages.warning(request, f'Package received, but label generation error: {str(e)}')
                else:
                    messages.success(request, 'Package received successfully! Shipment updated with actual dimensions.')
            else:
                messages.success(request, 'Package received successfully!')
            
            # Redirect to package detail page
            return redirect(f'admin:logistics_package_change', package.id)
        
        context['reference_number'] = reference_number or (package.reference_number if package else '')
        context['package'] = package
        context['buying_request'] = buying_request
        context['error'] = error
        context['package_id'] = package_id
        
        # If package is found and we have package_id, don't show search form
        context['show_search'] = not (package_id and package)
        
        return render(request, 'admin/logistics/package/receive_package.html', context)
    
    def mark_inspected_view(self, request, package_id):
        """Mark package as inspected"""
        package = get_object_or_404(Package, pk=package_id)
        
        if package.status != 'received':
            messages.error(request, f'Package must be in "received" status to mark as inspected. Current status: {package.get_status_display()}')
            return redirect('admin:logistics_package_change', package.id)
        
        if request.method == 'POST':
            package.status = 'inspected'
            package.save()
            
            # Create tracking update
            if package.shipment:
                TrackingUpdate.objects.create(
                    shipment=package.shipment,
                    status='inspected',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'package_id': package.id,
                        'package_reference': package.reference_number,
                        'action': 'marked_as_inspected',
                        'worker': request.user.email,
                    }
                )
            
            messages.success(request, f'Package {package.reference_number} marked as inspected.')
            return redirect('admin:logistics_package_change', package.id)
        
        # Show confirmation page
        context = {
            'title': 'Mark Package as Inspected',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'package': package,
        }
        return render(request, 'admin/logistics/package/confirm_action.html', context)
    
    def mark_ready_view(self, request, package_id):
        """Mark package as ready to ship"""
        package = get_object_or_404(Package, pk=package_id)
        
        if package.status != 'inspected':
            messages.error(request, f'Package must be in "inspected" status to mark as ready. Current status: {package.get_status_display()}')
            return redirect('admin:logistics_package_change', package.id)
        
        if request.method == 'POST':
            package.status = 'ready'
            package.save()
            
            # Create tracking update
            if package.shipment:
                TrackingUpdate.objects.create(
                    shipment=package.shipment,
                    status='ready_to_ship',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'package_id': package.id,
                        'package_reference': package.reference_number,
                        'action': 'marked_as_ready',
                        'worker': request.user.email,
                    }
                )
            
            messages.success(request, f'Package {package.reference_number} marked as ready to ship.')
            return redirect('admin:logistics_package_change', package.id)
        
        # Show confirmation page
        context = {
            'title': 'Mark Package as Ready to Ship',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'package': package,
        }
        return render(request, 'admin/logistics/package/confirm_action.html', context)
    
    def mark_in_transit_view(self, request, package_id):
        """Mark package as in transit"""
        package = get_object_or_404(Package, pk=package_id)
        
        if package.status != 'ready':
            messages.error(request, f'Package must be in "ready" status to mark as in transit. Current status: {package.get_status_display()}')
            return redirect('admin:logistics_package_change', package.id)
        
        if request.method == 'POST':
            package.status = 'in_transit'
            package.save()
            
            # Create tracking update
            if package.shipment:
                TrackingUpdate.objects.create(
                    shipment=package.shipment,
                    status='in_transit',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'package_id': package.id,
                        'package_reference': package.reference_number,
                        'action': 'marked_as_in_transit',
                        'worker': request.user.email,
                    }
                )
            
            messages.success(request, f'Package {package.reference_number} marked as in transit.')
            return redirect('admin:logistics_package_change', package.id)
        
        # Show confirmation page
        context = {
            'title': 'Mark Package as In Transit',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'package': package,
        }
        return render(request, 'admin/logistics/package/confirm_action.html', context)
    
    def mark_delivered_view(self, request, package_id):
        """Mark package as delivered (requires delivery photos)"""
        package = get_object_or_404(Package, pk=package_id)
        
        if package.status != 'in_transit':
            messages.error(request, f'Package must be in "in_transit" status to mark as delivered. Current status: {package.get_status_display()}')
            return redirect('admin:logistics_package_change', package.id)
        
        if request.method == 'POST':
            # Handle delivery photo uploads
            for i in range(1, 6):
                photo_field = f'delivery_photo_{i}'
                if photo_field in request.FILES:
                    setattr(package, photo_field, request.FILES[photo_field])
            
            package.status = 'delivered'
            package.save()
            
            # Update linked shipment
            if package.shipment:
                # Create tracking update
                TrackingUpdate.objects.create(
                    shipment=package.shipment,
                    status='delivered',
                    location=package.shipment.destination_address.get('city', '') or '',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'package_id': package.id,
                        'package_reference': package.reference_number,
                        'action': 'marked_as_delivered',
                        'worker': request.user.email,
                        'delivery_photos_uploaded': any([
                            getattr(package, f'delivery_photo_{i}', None) 
                            for i in range(1, 6)
                        ]),
                    }
                )
                
                # Update shipment status to delivered
                package.shipment.status = 'delivered'
                package.shipment.actual_delivery = timezone.now()
                package.shipment.save()
            
            messages.success(request, f'Package {package.reference_number} marked as delivered. Shipment status updated.')
            return redirect('admin:logistics_package_change', package.id)
        
        # Show delivery form with photo upload
        context = {
            'title': 'Mark Package as Delivered',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'package': package,
        }
        return render(request, 'admin/logistics/package/mark_delivered.html', context)


@admin.register(LogisticsShipment)
class LogisticsShipmentAdmin(admin.ModelAdmin):
    list_display = ['shipment_number', 'user_email', 'status_badge', 'transport_mode', 'total_cost', 'tracking_link', 'created_at']
    list_filter = ['status', 'transport_mode', 'source_type', 'created_at']
    search_fields = ['shipment_number', 'tracking_number', 'user__email']
    readonly_fields = ['shipment_number', 'created_at', 'updated_at', 'tracking_updates_display']
    
    def save_model(self, request, obj, form, change):
        """Override save to create TrackingUpdate on status changes"""
        from logistics.models import TrackingUpdate
        from django.utils import timezone
        
        # Get old status before saving
        old_status = None
        if change:
            try:
                old_obj = LogisticsShipment.objects.get(pk=obj.pk)
                old_status = old_obj.status
            except LogisticsShipment.DoesNotExist:
                pass
        
        # Save the model first
        super().save_model(request, obj, form, change)
        
        # Create TrackingUpdate if status changed
        if change and old_status and old_status != obj.status:
            TrackingUpdate.objects.create(
                shipment=obj,
                status=obj.status,
                location=obj.destination_address.get('city', '') if obj.destination_address else '',
                timestamp=timezone.now(),
                source='manual',
                raw_data={
                    'old_status': old_status,
                    'new_status': obj.status,
                    'updated_by': request.user.email if request.user else 'admin',
                    'shipment_number': obj.shipment_number,
                }
            )
            messages.success(request, f'Status updated to {obj.get_status_display()}. Tracking update created.')
    
    readonly_fields = ['tracking_updates_display']
    
    fieldsets = (
        ('Shipment Information', {
            'fields': ('user', 'shipment_number', 'source_type', 'status')
        }),
        ('Transport Details', {
            'fields': ('transport_mode', 'service_level', 'carrier')
        }),
        ('Weight & Dimensions', {
            'fields': ('actual_weight', 'chargeable_weight', 'actual_volume')
        }),
        ('Addresses', {
            'fields': ('origin_address', 'destination_address'),
            'classes': ('collapse',)
        }),
        ('Pricing', {
            'fields': ('shipping_cost', 'insurance_cost', 'service_fee', 'total_cost')
        }),
        ('Tracking', {
            'fields': ('tracking_number', 'easyship_shipment_id', 'easyship_label_url', 
                      'estimated_delivery', 'actual_delivery', 'tracking_updates_display')
        }),
        ('Packages', {
            'fields': ('packages',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    filter_horizontal = ['packages']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'quote_requested': 'gray',
            'quote_approved': 'blue',
            'payment_pending': 'orange',
            'payment_received': 'green',
            'processing': 'purple',
            'dispatched': 'blue',
            'in_transit': 'orange',
            'customs_clearance': 'yellow',
            'out_for_delivery': 'cyan',
            'delivered': 'green',
            'cancelled': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">{}</span>',
            color,
            obj.status.replace('_', ' ')
        )
    status_badge.short_description = 'Status'
    
    def tracking_link(self, obj):
        if obj.tracking_number:
            return format_html(
                '<a href="/admin/logistics/logisticsshipment/{}/change/" target="_blank">{}</a>',
                obj.id,
                obj.tracking_number
            )
        return '-'
    tracking_link.short_description = 'Tracking'
    
    def tracking_updates_display(self, obj):
        """Display all tracking updates in chronological order"""
        from logistics.models import TrackingUpdate
        updates = TrackingUpdate.objects.filter(shipment=obj).order_by('timestamp')
        
        if not updates.exists():
            return mark_safe('<p style="color: #999;">No tracking updates yet.</p>')
        
        html = '<div style="max-height: 500px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">'
        html += '<h3 style="margin-top: 0; margin-bottom: 15px;">📦 Tracking History</h3>'
        html += '<div style="position: relative; padding-left: 30px;">'
        
        # Status colors
        status_colors = {
            'pickup_scheduled': '#2196F3',
            'pickup_rescheduled': '#FF9800',
            'scheduled': '#2196F3',
            'in_progress': '#FF9800',
            'completed': '#4CAF50',
            'picked_up': '#4CAF50',
            'warehouse_received': '#4CAF50',
            'processing': '#9C27B0',
            'in_transit': '#2196F3',
            'delivered': '#4CAF50',
            'cancelled': '#F44336',
            'failed': '#F44336',
        }
        
        for idx, update in enumerate(updates):
            is_last = idx == len(updates) - 1
            color = status_colors.get(update.status, '#757575')
            
            # Timeline line
            if not is_last:
                html += '<div style="position: absolute; left: 5px; top: 25px; bottom: -10px; width: 2px; background: #ddd;"></div>'
            
            # Timeline dot
            html += f'<div style="position: absolute; left: 0; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: {color}; border: 2px solid white; box-shadow: 0 0 0 2px {color};"></div>'
            
            # Update content
            html += '<div style="margin-bottom: 20px; padding-left: 20px;">'
            html += f'<div style="font-weight: bold; color: {color}; margin-bottom: 5px;">{update.status.replace("_", " ").title()}</div>'
            
            if update.location:
                html += f'<div style="color: #666; font-size: 12px; margin-bottom: 3px;">📍 {update.location}</div>'
            
            html += f'<div style="color: #999; font-size: 11px; margin-bottom: 5px;">🕐 {update.timestamp.strftime("%Y-%m-%d %H:%M:%S")}</div>'
            
            if update.source:
                source_label = '🤖 System' if update.source == 'webhook' else '👤 Manual'
                html += f'<div style="color: #999; font-size: 11px;">{source_label}</div>'
            
            # Show additional info from raw_data
            if update.raw_data:
                raw_info = []
                if 'status_message' in update.raw_data:
                    raw_info.append(f"Message: {update.raw_data['status_message']}")
                if 'worker' in update.raw_data:
                    raw_info.append(f"Worker: {update.raw_data['worker']}")
                if 'scheduled_datetime' in update.raw_data:
                    from django.utils.dateparse import parse_datetime
                    dt = parse_datetime(update.raw_data['scheduled_datetime'])
                    if dt:
                        raw_info.append(f"Scheduled: {dt.strftime('%Y-%m-%d %H:%M')}")
                
                if raw_info:
                    html += f'<div style="color: #666; font-size: 11px; margin-top: 5px; padding: 5px; background: white; border-radius: 3px;">{" | ".join(raw_info)}</div>'
            
            html += '</div>'
        
        html += '</div>'
        html += '</div>'
        
        return mark_safe(html)
    tracking_updates_display.short_description = 'Tracking Updates'


class ShippingCategoriesWidget(forms.CheckboxSelectMultiple):
    """Custom widget for shipping categories multi-select"""
    template_name = 'admin/logistics/widgets/shipping_categories_widget.html'
    
    def __init__(self, attrs=None, choices=()):
        super().__init__(attrs, choices)
        self.choices = choices


class ShippingCalculationSettingsForm(forms.ModelForm):
    """Custom form for ShippingCalculationSettings with category multi-select"""
    shipping_categories = forms.MultipleChoiceField(
        choices=ShippingCalculationSettings.SHIPPING_CATEGORIES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text="Select categories these settings apply to. Leave empty to apply to all categories."
    )
    
    class Meta:
        model = ShippingCalculationSettings
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            # Load existing categories from JSONField
            self.initial['shipping_categories'] = self.instance.shipping_categories or []
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        # Save categories as list
        instance.shipping_categories = self.cleaned_data.get('shipping_categories', [])
        if commit:
            instance.save()
        return instance


@admin.register(ShippingCalculationSettings)
class ShippingCalculationSettingsAdmin(admin.ModelAdmin):
    form = ShippingCalculationSettingsForm
    list_display = ['settings_display', 'transport_mode', 'categories_display', 'is_global_default', 'fuel_surcharge_percent', 'security_fee']
    list_filter = ['is_global_default', 'transport_mode']
    search_fields = ['route__origin_country__name', 'route__destination_country__name', 'transport_mode__name']
    
    def categories_display(self, obj):
        return obj.get_shipping_categories_display()
    categories_display.short_description = 'Categories'
    
    fieldsets = (
        ('Settings Type', {
            'fields': ('route', 'transport_mode', 'shipping_categories', 'is_global_default'),
            'description': 'Leave route empty for global defaults, or select a route for route-specific settings. Select categories these settings apply to (leave empty for all categories).'
        }),
        ('Air Freight Pricing', {
            'fields': ('base_rate', 'per_kg_rate', 'fuel_surcharge_percent', 'security_fee', 'dimensional_weight_divisor', 'handling_fee', 'bulk_discount_percent'),
            'description': 'Base rate and per-kg rate for air freight. Formula: base_rate + (weight × per_kg_rate) + surcharges'
        }),
        ('Sea Freight LCL Pricing', {
            'fields': ('base_rate_sea', 'per_kg_rate_sea', 'rate_per_cbm', 'rate_per_ton', 'ocean_freight_base', 
                      'port_origin_handling', 'port_destination_handling', 
                      'documentation_fee', 'customs_clearance_fee', 'destination_delivery_fee'),
            'description': 'LCL (Less than Container Load) pricing for sea freight'
        }),
        ('Sea Freight FCL Settings', {
            'fields': ('container_20ft_price', 'container_40ft_price', 'container_20ft_cbm', 'container_40ft_cbm',
                      'container_origin_fees', 'container_destination_fees', 
                      'container_customs_fee', 'container_delivery_fee'),
            'description': 'FCL (Full Container Load) pricing for sea freight'
        }),
        ('Rail Freight Pricing', {
            'fields': ('base_rate_rail', 'per_kg_rate_rail', 'terminal_handling_fee', 'customs_fee_rail'),
            'description': 'Rail freight pricing. Formula: base_rate_rail + (weight × per_kg_rate_rail) + terminal_handling + customs'
        }),
        ('Truck/Road Freight Pricing', {
            'fields': ('base_rate_truck', 'per_kg_rate_truck', 'customs_fee_truck'),
            'description': 'Truck/road freight pricing. base_rate_truck is per 100 lbs (CWT) for LTL shipments'
        }),
    )
    
    def settings_display(self, obj):
        if obj.route:
            return format_html(
                '<strong>{} → {}</strong><br><small>{}</small>',
                obj.route.origin_country.code,
                obj.route.destination_country.code,
                obj.transport_mode.name
            )
        return format_html('<strong>Global Default</strong><br><small>{}</small>', obj.transport_mode.name)
    settings_display.short_description = 'Settings'


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'session_id', 'route_display', 'weight', 'shipping_category', 'pickup_required', 'converted_to_shipment', 'expires_at', 'created_at']
    list_filter = ['converted_to_shipment', 'shipping_category', 'pickup_required', 'created_at', 'expires_at']
    search_fields = ['session_id', 'origin_country__name', 'destination_country__name']
    readonly_fields = ['created_at', 'expires_at']
    
    def route_display(self, obj):
        return f"{obj.origin_country.code} → {obj.destination_country.code}"
    route_display.short_description = 'Route'


@admin.register(TrackingUpdate)
class TrackingUpdateAdmin(admin.ModelAdmin):
    list_display = ['id', 'shipment_number', 'status', 'location', 'timestamp', 'source', 'carrier_tracking_number']
    list_filter = ['status', 'source', 'timestamp']
    search_fields = ['shipment__shipment_number', 'carrier_tracking_number', 'status']
    readonly_fields = ['created_at']
    
    def shipment_number(self, obj):
        return obj.shipment.shipment_number
    shipment_number.short_description = 'Shipment'


@admin.register(PickupRequest)
class PickupRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'shipment_number', 'vehicle_info', 'status_badge', 'worker_name', 'scheduled_datetime', 'pickup_attempts', 'contact_name', 'contact_phone']
    list_filter = ['status', 'scheduled_date', 'created_at', 'worker', 'shipment__source_type']
    search_fields = ['shipment__shipment_number', 'contact_name', 'contact_phone', 'worker__email', 'shipment__vehicle__make', 'shipment__vehicle__model', 'shipment__vehicle__vin']
    readonly_fields = ['created_at', 'updated_at', 'pickup_address_display', 'vehicle_details_display', 'action_buttons']
    
    fieldsets = (
        ('Actions', {
            'fields': ('action_buttons',),
            'description': 'Quick actions for pickup workers'
        }),
        ('Shipment Information', {
            'fields': ('shipment', 'status')
        }),
        ('Vehicle Information', {
            'fields': ('vehicle_details_display',),
            'description': 'Vehicle details (if this is a vehicle pickup)'
        }),
        ('Worker Assignment', {
            'fields': ('worker',)
        }),
        ('Pickup Address', {
            'fields': ('pickup_address_display', 'contact_name', 'contact_phone', 'special_instructions'),
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'scheduled_time', 'scheduled_datetime'),
        }),
        ('Status Tracking', {
            'fields': ('pickup_attempts', 'last_attempt_date', 'failure_reason', 'notes'),
        }),
        ('Completion Details', {
            'fields': ('completed_at', 'picked_up_at', 'delivered_to_warehouse_at'),
        }),
        ('Package Details', {
            'fields': ('expected_weight', 'expected_dimensions', 'actual_weight', 'actual_dimensions'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def shipment_number(self, obj):
        return obj.shipment.shipment_number
    shipment_number.short_description = 'Shipment'
    
    def worker_name(self, obj):
        return obj.worker.get_full_name() if obj.worker else 'Unassigned'
    worker_name.short_description = 'Worker'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'gray',
            'scheduled': 'blue',
            'in_progress': 'orange',
            'completed': 'green',
            'failed': 'red',
            'cancelled': 'darkred'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">{}</span>',
            color,
            obj.status.replace('_', ' ')
        )
    status_badge.short_description = 'Status'
    
    def pickup_address_display(self, obj):
        if obj.pickup_address:
            addr = obj.pickup_address
            return format_html(
                '<strong>{}</strong><br>{}<br>{}<br>{}, {} {}<br>{}',
                addr.get('full_name', ''),
                addr.get('street_address', ''),
                addr.get('street_address_2', ''),
                addr.get('city', ''),
                addr.get('state_province', ''),
                addr.get('postal_code', ''),
                addr.get('country', '')
            )
        return '-'
    pickup_address_display.short_description = 'Pickup Address'
    
    def vehicle_info(self, obj):
        """Display vehicle make, model, year in list view"""
        if obj.shipment and hasattr(obj.shipment, 'vehicle') and obj.shipment.vehicle:
            vehicle = obj.shipment.vehicle
            return format_html(
                '<strong>{} {} {}</strong><br><small>VIN: {}</small>',
                vehicle.year,
                vehicle.make,
                vehicle.model,
                vehicle.vin or 'N/A'
            )
        return '-'
    vehicle_info.short_description = 'Vehicle'
    
    def vehicle_details_display(self, obj):
        """Display full vehicle details in detail view"""
        if not obj.shipment:
            return mark_safe('<p style="color: #999;">No shipment linked to this pickup request.</p>')
        
        # Check if this is a vehicle shipment first
        is_vehicle_shipment = (
            obj.shipment.shipping_category == 'vehicle' or 
            obj.shipment.source_type == 'vehicle'
        )
        
        # Check if shipment has a vehicle (OneToOneField with related_name='vehicle')
        # Accessing a OneToOneField that doesn't exist raises RelatedObjectDoesNotExist
        try:
            vehicle = obj.shipment.vehicle
            if vehicle:
                vehicle_url = reverse('admin:vehicles_vehicle_change', args=[vehicle.id])
                
                return format_html(
                    '<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">'
                    '<h3 style="margin-top: 0;">🚗 Vehicle Details</h3>'
                    '<p><strong>Make:</strong> {}</p>'
                    '<p><strong>Model:</strong> {}</p>'
                    '<p><strong>Year:</strong> {}</p>'
                    '<p><strong>VIN:</strong> {}</p>'
                    '<p><strong>Type:</strong> {}</p>'
                    '<p><strong>Condition:</strong> {}</p>'
                    '<p><strong>Shipping Method:</strong> {}</p>'
                    '<p><strong>Dimensions:</strong> {} cm × {} cm × {} cm</p>'
                    '<p><strong>Weight:</strong> {} kg</p>'
                    '<p><strong>Status:</strong> {}</p>'
                    '<p><a href="{}" target="_blank">View Full Vehicle Details →</a></p>'
                    '</div>',
                    vehicle.make or 'N/A',
                    vehicle.model or 'N/A',
                    vehicle.year or 'N/A',
                    vehicle.vin or 'N/A',
                    vehicle.get_vehicle_type_display() if vehicle.vehicle_type else 'N/A',
                    vehicle.get_condition_display() if vehicle.condition else 'N/A',
                    vehicle.get_shipping_method_display() if vehicle.shipping_method else 'N/A',
                    vehicle.length or 0,
                    vehicle.width or 0,
                    vehicle.height or 0,
                    vehicle.weight or 0,
                    vehicle.get_status_display() if vehicle.status else 'N/A',
                    vehicle_url
                )
        except Exception as e:
            # RelatedObjectDoesNotExist or other exception - no vehicle linked
            # If this is a vehicle shipment, show warning
            if is_vehicle_shipment:
                return mark_safe(
                    '<p style="color: orange; font-weight: bold;">⚠️ This is a vehicle shipment, but no Vehicle record is linked to the shipment. '
                    'Please check that the Vehicle model has its shipment field set to this LogisticsShipment.</p>'
                )
        
        # Not a vehicle shipment
        return mark_safe('<p style="color: #999;">This pickup is not for a vehicle.</p>')
    vehicle_details_display.short_description = 'Vehicle Details'
    
    actions = ['mark_as_scheduled', 'mark_as_completed', 'mark_as_failed', 'mark_as_picked_up', 'mark_as_dropped_off']
    
    def mark_as_scheduled(self, request, queryset):
        queryset.update(status='scheduled')
    mark_as_scheduled.short_description = 'Mark selected as scheduled'
    
    def mark_as_completed(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='completed', completed_at=timezone.now(), picked_up_at=timezone.now())
    mark_as_completed.short_description = 'Mark selected as completed'
    
    def mark_as_failed(self, request, queryset):
        queryset.update(status='failed')
    mark_as_failed.short_description = 'Mark selected as failed'
    
    def mark_as_picked_up(self, request, queryset):
        from django.utils import timezone
        from logistics.models import TrackingUpdate
        updated = 0
        for pickup in queryset:
            pickup.picked_up_at = timezone.now()
            pickup.status = 'in_progress'
            pickup.pickup_attempts += 1
            pickup.last_attempt_date = timezone.now()
            pickup.save()
            
            # Create tracking update
            if pickup.shipment:
                TrackingUpdate.objects.create(
                    shipment=pickup.shipment,
                    status='picked_up',
                    location=pickup.pickup_address.get('city', '') if pickup.pickup_address else '',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'pickup_request_id': pickup.id,
                        'picked_up_at': pickup.picked_up_at.isoformat(),
                    }
                )
            updated += 1
        self.message_user(request, f'{updated} pickup(s) marked as picked up.')
    mark_as_picked_up.short_description = 'Mark selected as picked up'
    
    def mark_as_dropped_off(self, request, queryset):
        from django.utils import timezone
        from logistics.models import TrackingUpdate
        updated = 0
        for pickup in queryset:
            pickup.delivered_to_warehouse_at = timezone.now()
            pickup.status = 'completed'
            pickup.completed_at = timezone.now()
            if not pickup.picked_up_at:
                pickup.picked_up_at = timezone.now()
            pickup.save()
            
            # Create tracking update
            if pickup.shipment:
                TrackingUpdate.objects.create(
                    shipment=pickup.shipment,
                    status='warehouse_received',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'pickup_request_id': pickup.id,
                        'delivered_to_warehouse_at': pickup.delivered_to_warehouse_at.isoformat(),
                    }
                )
                # Update shipment status
                pickup.shipment.status = 'processing'
                pickup.shipment.save()
            updated += 1
        self.message_user(request, f'{updated} pickup(s) marked as dropped off at warehouse.')
    mark_as_dropped_off.short_description = 'Mark selected as dropped off at warehouse'
    
    def action_buttons(self, obj):
        """Display action buttons for pickup workers"""
        if not obj or not obj.pk:
            return '-'
        
        buttons = []
        
        # Picked Up button - show if not already picked up
        if not obj.picked_up_at:
            picked_up_url = reverse('admin:logistics_pickuprequest_picked_up', args=[obj.pk])
            buttons.append(
                format_html(
                    '<a href="{}" class="button" style="padding: 8px 16px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 8px; font-weight: bold;">✓ Picked Up</a>',
                    picked_up_url
                )
            )
        
        # Dropped Off button - show if picked up but not delivered
        if obj.picked_up_at and not obj.delivered_to_warehouse_at:
            dropped_off_url = reverse('admin:logistics_pickuprequest_dropped_off', args=[obj.pk])
            buttons.append(
                format_html(
                    '<a href="{}" class="button" style="padding: 8px 16px; background: #17a2b8; color: white; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">📦 Dropped Off</a>',
                    dropped_off_url
                )
            )
        
        if not buttons:
            return mark_safe('<span style="color: green;">✓ Completed</span>')
        
        buttons_html = ''.join(buttons)
        if buttons_html:
            return mark_safe(buttons_html)
        return '-'
    action_buttons.short_description = 'Quick Actions'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:pickup_id>/picked-up/', self.picked_up_view, name='logistics_pickuprequest_picked_up'),
            path('<int:pickup_id>/dropped-off/', self.dropped_off_view, name='logistics_pickuprequest_dropped_off'),
        ]
        return custom_urls + urls
    
    def picked_up_view(self, request, pickup_id):
        """Handle picked up button click"""
        from django.utils import timezone
        from logistics.models import TrackingUpdate
        
        pickup = get_object_or_404(PickupRequest, pk=pickup_id)
        
        if pickup.picked_up_at:
            messages.warning(request, 'This pickup has already been marked as picked up.')
        else:
            pickup.picked_up_at = timezone.now()
            pickup.status = 'in_progress'
            pickup.pickup_attempts += 1
            pickup.last_attempt_date = timezone.now()
            pickup.save()
            
            # Create tracking update
            if pickup.shipment:
                TrackingUpdate.objects.create(
                    shipment=pickup.shipment,
                    status='picked_up',
                    location=pickup.pickup_address.get('city', '') if pickup.pickup_address else '',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'pickup_request_id': pickup.id,
                        'picked_up_at': pickup.picked_up_at.isoformat(),
                    }
                )
            
            messages.success(request, f'Pickup marked as picked up at {pickup.picked_up_at.strftime("%Y-%m-%d %H:%M:%S")}.')
        
        return redirect(reverse('admin:logistics_pickuprequest_change', args=[pickup.id]))
    
    def dropped_off_view(self, request, pickup_id):
        """Handle dropped off button click"""
        from django.utils import timezone
        from logistics.models import TrackingUpdate
        
        pickup = get_object_or_404(PickupRequest, pk=pickup_id)
        
        if pickup.delivered_to_warehouse_at:
            messages.warning(request, 'This pickup has already been marked as dropped off.')
        else:
            if not pickup.picked_up_at:
                pickup.picked_up_at = timezone.now()
            
            pickup.delivered_to_warehouse_at = timezone.now()
            pickup.status = 'completed'
            pickup.completed_at = timezone.now()
            pickup.save()
            
            # Create tracking update
            if pickup.shipment:
                TrackingUpdate.objects.create(
                    shipment=pickup.shipment,
                    status='warehouse_received',
                    location='Warehouse',
                    timestamp=timezone.now(),
                    source='manual',
                    raw_data={
                        'pickup_request_id': pickup.id,
                        'delivered_to_warehouse_at': pickup.delivered_to_warehouse_at.isoformat(),
                    }
                )
                # Update shipment status
                pickup.shipment.status = 'processing'
                pickup.shipment.save()
            
            messages.success(request, f'Pickup marked as dropped off at warehouse at {pickup.delivered_to_warehouse_at.strftime("%Y-%m-%d %H:%M:%S")}.')
        
        return redirect(reverse('admin:logistics_pickuprequest_change', args=[pickup.id]))


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'shipping_categories_display', 'city', 'state_province', 'is_active', 'priority']
    list_filter = ['country', 'is_active']
    search_fields = ['name', 'city', 'state_province', 'country__name', 'country__code']
    
    def shipping_categories_display(self, obj):
        return obj.get_shipping_categories_display()
    shipping_categories_display.short_description = 'Shipping Categories'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'country', 'shipping_categories', 'is_active', 'priority'),
            'description': 'Enter shipping categories as a JSON list, e.g., ["small_parcel", "heavy_parcel"] or ["all"] for all categories.'
        }),
        ('Address', {
            'fields': ('full_name', 'company', 'street_address', 'street_address_2', 
                      'city', 'state_province', 'postal_code', 'phone')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
    )
    ordering = ['-priority', '-is_active', 'country', 'name']


@admin.register(PickupCalculationSettings)
class PickupCalculationSettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'country', 'state', 'shipping_category', 'base_pickup_fee', 'per_kg_rate', 'is_global_fallback', 'is_active']
    list_filter = ['is_active', 'is_global_fallback', 'country', 'shipping_category']
    search_fields = ['country__name', 'state']
    
    fieldsets = (
        ('Location & Category', {
            'fields': ('country', 'state', 'shipping_category', 'is_global_fallback', 'is_active'),
            'description': 'Set is_global_fallback=True to use these as fallback defaults when no specific settings are found. State is required for USA addresses.'
        }),
        ('Pricing Structure', {
            'fields': ('base_pickup_fee', 'per_kg_rate', 'per_km_rate', 'minimum_pickup_fee')
        }),
        ('Dimensional Weight', {
            'fields': ('use_dimensional_weight', 'dimensional_weight_divisor')
        }),
        ('Additional Fees', {
            'fields': ('residential_fee', 'lift_gate_fee')
        }),
        ('Markup', {
            'fields': ('markup_percent',)
        }),
    )
    ordering = ['country', 'state', 'shipping_category']


# Customize admin site header and title
admin.site.site_header = 'YuuSell Logistics Administration'
admin.site.site_title = 'YuuSell Logistics Admin'
admin.site.index_title = 'Welcome to YuuSell Logistics Administration'
