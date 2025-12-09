from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponseRedirect
from .models import BuyingRequest, BuyAndShipQuote
from .services.quote_generator import QuoteGenerator
from .services.email_service import (
    send_quote_created_user_email,
    send_purchased_user_email,
    send_delivered_user_email
)


class BuyAndShipQuoteInline(admin.TabularInline):
    model = BuyAndShipQuote
    extra = 0
    readonly_fields = ['created_at', 'updated_at']
    fields = ('shipping_mode', 'product_cost', 'sales_tax', 'buying_service_fee', 'shipping_cost', 'total_cost', 'status', 'created_at')


@admin.register(BuyingRequest)
class BuyingRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_email', 'product_name_short', 'status_badge', 'reference_number', 'quote_count', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product_name', 'product_description', 'user__email', 'reference_number']
    readonly_fields = ['reference_number', 'created_at', 'updated_at', 'generate_quotes_button']
    inlines = [BuyAndShipQuoteInline]
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Product Information', {
            'fields': ('product_url', 'product_name', 'product_description', 'product_image', 'max_budget')
        }),
        ('Shipping', {
            'fields': ('shipping_address',)
        }),
        ('Quote Information', {
            'fields': ('approximate_quote_data',),
            'description': 'Product cost, tax, and shipping details are stored in BuyAndShipQuote model. Use the inline quotes section below to view/edit quote details.'
        }),
        ('Purchase Details', {
            'fields': ('purchase_receipt', 'purchase_tracking', 'purchase_date', 'reference_number')
        }),
        ('Status', {
            'fields': ('status', 'notes')
        }),
        ('Actions', {
            'fields': ('generate_quotes_button',),
            'description': 'Click the button below to automatically generate quotes for all available shipping options.'
        }),
        ('Linked Objects', {
            'fields': ('package', 'shipment')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def product_name_short(self, obj):
        return obj.product_name[:50] if obj.product_name else obj.product_description[:50]
    product_name_short.short_description = 'Product'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'quoted': 'blue',
            'quote_approved': 'green',
            'payment_pending': 'yellow',
            'payment_received': 'green',
            'purchased': 'purple',
            'delivered': 'green',
            'completed': 'darkgreen',
            'cancelled': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def quote_count(self, obj):
        count = obj.quotes.count()
        if count > 0:
            url = reverse('admin:buying_buyandshipquote_changelist')
            return format_html('<a href="{}?buying_request__id__exact={}">{} Quote(s)</a>', url, obj.id, count)
        return '0'
    quote_count.short_description = 'Quotes'
    
    def generate_quotes_button(self, obj):
        """Display button to generate quotes"""
        if obj.pk:  # Only show if object exists
            url = reverse('admin:buying_buyingrequest_generate_quotes', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background-color: #417690; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">🚀 Generate Quotes Automatically</a>',
                url
            )
        return 'Save the request first to generate quotes'
    generate_quotes_button.short_description = 'Auto-Generate Quotes'
    
    def get_urls(self):
        """Add custom URL for quote generation"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:object_id>/generate-quotes/',
                self.admin_site.admin_view(self.generate_quotes_view),
                name='buying_buyingrequest_generate_quotes',
            ),
        ]
        return custom_urls + urls
    
    def generate_quotes_view(self, request, object_id):
        """View to generate quotes automatically"""
        buying_request = BuyingRequest.objects.get(pk=object_id)
        
        # Check if quotes already exist
        existing_quotes_count = buying_request.quotes.count()
        if existing_quotes_count > 0:
            messages.warning(
                request,
                f'This request already has {existing_quotes_count} quote(s). Generating new quotes will add to existing ones.'
            )
        
        try:
            # Store original status to check if we should send email
            original_status = buying_request.status
            
            # Generate quotes automatically
            generator = QuoteGenerator()
            created_quotes = generator.create_all_shipping_quotes(buying_request)
            
            if created_quotes:
                # Update status to 'quoted' if not already
                if buying_request.status != 'quoted':
                    buying_request.status = 'quoted'
                    buying_request.save()
                
                messages.success(
                    request,
                    f'Successfully generated {len(created_quotes)} quote(s) for this buying request! '
                    f'Review the quotes below, make any adjustments if needed, then click "Save" to send email notification to the user.'
                )
                
                # Send email immediately if status was 'pending'
                if original_status == 'pending':
                    try:
                        send_quote_created_user_email(buying_request, created_quotes)
                        messages.success(
                            request,
                            f'✅ Email notification sent to {buying_request.user.email} - Quotes are ready!'
                        )
                    except Exception as email_error:
                        messages.warning(
                            request,
                            f'⚠️ Quotes generated but failed to send email: {str(email_error)}'
                        )
                else:
                    # Store flag to send email when agent saves (if status wasn't pending)
                    request.session['send_quote_email_for_request'] = buying_request.id
            else:
                messages.warning(
                    request,
                    'No quotes could be generated. Please check that the buying request has valid shipping address and product information.'
                )
        except Exception as e:
            messages.error(
                request,
                f'Error generating quotes: {str(e)}'
            )
        
        # Redirect back to the change page
        return HttpResponseRedirect(
            reverse('admin:buying_buyingrequest_change', args=[object_id])
        )
    
    def save_model(self, request, obj, form, change):
        """Override save to send email when status changes"""
        # Get old status before saving
        old_status = None
        if change:
            try:
                old_obj = BuyingRequest.objects.get(pk=obj.pk)
                old_status = old_obj.status
            except BuyingRequest.DoesNotExist:
                pass
        
        # Save the model first
        super().save_model(request, obj, form, change)
        
        # Check if status changed
        status_changed = change and old_status and old_status != obj.status
        
        # Send emails based on status changes
        if status_changed:
            # Status changed to 'quoted' - send quote email
            if obj.status == 'quoted' and obj.quotes.exists():
                quotes = obj.quotes.all()
                try:
                    send_quote_created_user_email(obj, quotes)
                    messages.success(
                        request,
                        f'✅ Email notification sent to {obj.user.email} - Quotes are ready for review!'
                    )
                except Exception as e:
                    messages.warning(
                        request,
                        f'⚠️ Failed to send quote email: {str(e)}'
                    )
            
            # Status changed to 'purchased' - send purchased email
            elif obj.status == 'purchased':
                try:
                    send_purchased_user_email(obj)
                    messages.success(
                        request,
                        f'✅ Email notification sent to {obj.user.email} - Item purchased confirmation!'
                    )
                except Exception as e:
                    messages.warning(
                        request,
                        f'⚠️ Failed to send purchased email: {str(e)}'
                    )
            
            # Status changed to 'delivered' - send delivered email
            elif obj.status == 'delivered':
                try:
                    send_delivered_user_email(obj)
                    messages.success(
                        request,
                        f'✅ Email notification sent to {obj.user.email} - Package delivered!'
                    )
                except Exception as e:
                    messages.warning(
                        request,
                        f'⚠️ Failed to send delivered email: {str(e)}'
                    )
        
        # Also check if we should send quote email (set when quotes were auto-generated but status wasn't pending)
        send_email_flag = request.session.pop('send_quote_email_for_request', None)
        if send_email_flag == obj.id and obj.status == 'quoted' and obj.quotes.exists() and not status_changed:
            quotes = obj.quotes.all()
            try:
                send_quote_created_user_email(obj, quotes)
                messages.success(
                    request,
                    f'✅ Email notification sent to {obj.user.email} - Quotes are ready for review!'
                )
            except Exception as e:
                messages.warning(
                    request,
                    f'⚠️ Failed to send quote email: {str(e)}'
                )


@admin.register(BuyAndShipQuote)
class BuyAndShipQuoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'buying_request_link', 'shipping_mode', 'total_cost', 'status_badge', 'created_at']
    list_filter = ['status', 'shipping_mode', 'created_at']
    search_fields = ['buying_request__product_name', 'buying_request__user__email', 'buying_request__reference_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Buying Request', {
            'fields': ('buying_request',)
        }),
        ('Product Costs', {
            'fields': ('product_cost', 'sales_tax', 'buying_service_fee', 'buying_service_fee_percent', 'domestic_shipping_cost')
        }),
        ('Shipping', {
            'fields': ('shipping_mode', 'shipping_cost', 'shipping_service_name', 'estimated_delivery_days')
        }),
        ('Total', {
            'fields': ('total_cost',)
        }),
        ('Status', {
            'fields': ('status', 'notes', 'shipment')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def buying_request_link(self, obj):
        url = reverse('admin:buying_buyingrequest_change', args=[obj.buying_request.id])
        return format_html('<a href="{}">#{}</a> - {}', url, obj.buying_request.id, obj.buying_request.product_name[:50])
    buying_request_link.short_description = 'Buying Request'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
            'expired': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

