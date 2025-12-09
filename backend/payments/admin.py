from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_id', 'user', 'amount', 'currency', 'payment_type', 'status', 'created_at']
    list_filter = ['status', 'payment_type', 'currency', 'created_at']
    search_fields = ['payment_id', 'stripe_payment_intent_id', 'user__email']

