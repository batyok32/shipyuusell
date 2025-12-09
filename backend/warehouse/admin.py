from django.contrib import admin
from .models import WarehouseReceiving, WarehouseLabel


@admin.register(WarehouseReceiving)
class WarehouseReceivingAdmin(admin.ModelAdmin):
    list_display = ['package', 'received_by', 'received_at', 'storage_location', 'damage_reported']
    list_filter = ['damage_reported', 'prohibited_items_found', 'received_at']


@admin.register(WarehouseLabel)
class WarehouseLabelAdmin(admin.ModelAdmin):
    list_display = ['label_number', 'user', 'carrier', 'status', 'cost', 'created_at']
    list_filter = ['status', 'carrier', 'created_at']
    search_fields = ['label_number', 'tracking_number', 'user__email']

