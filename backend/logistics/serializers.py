from rest_framework import serializers
from .models import Package, LogisticsShipment, Country, TransportMode, ShippingRoute, TrackingUpdate


class PackageSerializer(serializers.ModelSerializer):
    shipment_info = serializers.SerializerMethodField()
    photos_list = serializers.SerializerMethodField()
    delivery_photos_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Package
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_shipment_info(self, obj):
        """Get shipment details if linked"""
        if obj.shipment:
            return {
                'id': obj.shipment.id,
                'shipment_number': obj.shipment.shipment_number,
                'status': obj.shipment.status,
                'tracking_number': obj.shipment.tracking_number,
                'source_type': obj.shipment.source_type,
            }
        return None
    
    def get_photos_list(self, obj):
        """Get list of uploaded photos"""
        photos = []
        for i in range(1, 6):
            photo = getattr(obj, f'photo_{i}', None)
            if photo:
                photos.append({
                    'id': i,
                    'url': photo.url,
                    'field': f'photo_{i}'
                })
        # Also include legacy JSONField photos
        if obj.photos:
            for idx, photo_url in enumerate(obj.photos, start=len(photos) + 1):
                photos.append({
                    'id': idx,
                    'url': photo_url,
                    'field': 'legacy'
                })
        return photos
    
    def get_delivery_photos_list(self, obj):
        """Get list of delivery photos"""
        photos = []
        for i in range(1, 6):
            photo = getattr(obj, f'delivery_photo_{i}', None)
            if photo:
                photos.append({
                    'id': i,
                    'url': photo.url,
                    'field': f'delivery_photo_{i}'
                })
        # Also include legacy JSONField photos
        if obj.delivery_photos:
            for idx, photo_url in enumerate(obj.delivery_photos, start=len(photos) + 1):
                photos.append({
                    'id': idx,
                    'url': photo_url,
                    'field': 'legacy'
                })
        return photos


class TrackingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for tracking updates"""
    class Meta:
        model = TrackingUpdate
        fields = ['id', 'status', 'location', 'timestamp', 'source', 'carrier_tracking_number', 'raw_data', 'created_at']
        read_only_fields = ['id', 'created_at']


class LogisticsShipmentSerializer(serializers.ModelSerializer):
    packages = serializers.SerializerMethodField()
    pickup_request_id = serializers.SerializerMethodField()
    tracking_updates = serializers.SerializerMethodField()
    is_paid = serializers.SerializerMethodField()
    
    class Meta:
        model = LogisticsShipment
        fields = '__all__'
        read_only_fields = ['id', 'shipment_number', 'created_at', 'updated_at']
    
    def get_packages(self, obj):
        """Get packages for this shipment"""
        packages = Package.objects.filter(shipment=obj)
        return PackageSerializer(packages, many=True).data
    
    def get_pickup_request_id(self, obj):
        """Get pickup request ID if exists"""
        try:
            return obj.pickup_request.id if hasattr(obj, 'pickup_request') else None
        except:
            return None
    
    def get_tracking_updates(self, obj):
        """Get all tracking updates for this shipment, ordered by timestamp"""
        from .models import TrackingUpdate
        updates = TrackingUpdate.objects.filter(shipment=obj).order_by('timestamp')
        return TrackingUpdateSerializer(updates, many=True).data
    
    def get_is_paid(self, obj):
        """Check if shipment has a completed payment"""
        from payments.models import Payment
        return Payment.objects.filter(shipment=obj, status='completed').exists()


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['code', 'name', 'continent', 'customs_required']


class TransportModeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportMode
        fields = '__all__'

