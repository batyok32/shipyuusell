from rest_framework import serializers
from .models import BuyingRequest, BuyAndShipQuote


class BuyAndShipQuoteSerializer(serializers.ModelSerializer):
    shipping_mode_name = serializers.CharField(source='shipping_mode.name', read_only=True)
    shipping_mode_code = serializers.CharField(source='shipping_mode.code', read_only=True)
    
    class Meta:
        model = BuyAndShipQuote
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class BuyingRequestSerializer(serializers.ModelSerializer):
    package = serializers.SerializerMethodField()
    quotes = BuyAndShipQuoteSerializer(many=True, read_only=True)
    shipment_tracking = serializers.SerializerMethodField()
    vehicle_info = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = BuyingRequest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'reference_number', 'user']
    
    def get_package(self, obj):
        if obj.package:
            return {
                'id': obj.package.id,
                'reference_number': obj.package.reference_number,
                'status': obj.package.status,
                'photos': obj.package.photos,
                'delivery_photos': obj.package.delivery_photos,
            }
        return None
    
    def get_shipment_tracking(self, obj):
        if obj.shipment:
            return {
                'shipment_number': obj.shipment.shipment_number,
                'tracking_number': obj.shipment.tracking_number,
                'status': obj.shipment.status,
                'carrier': obj.shipment.carrier,
            }
        return None
    
    def get_vehicle_info(self, obj):
        """Get vehicle information if this is a vehicle request"""
        if obj.shipment and hasattr(obj.shipment, 'vehicle') and obj.shipment.vehicle:
            vehicle = obj.shipment.vehicle
            return {
                'id': vehicle.id,
                'make': vehicle.make,
                'model': vehicle.model,
                'year': vehicle.year,
                'vin': vehicle.vin,
                'vehicle_type': vehicle.vehicle_type,
                'status': vehicle.status,
                'shipping_method': vehicle.shipping_method,
                'condition': vehicle.condition,
            }
        return None

