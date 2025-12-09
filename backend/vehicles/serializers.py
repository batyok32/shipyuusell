from rest_framework import serializers
from .models import Vehicle, VehicleDocument


class VehicleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDocument
        fields = ['id', 'name', 'document_type', 'document_type_display', 'file', 'description', 'is_required']
        read_only_fields = ['id']


class VehicleSerializer(serializers.ModelSerializer):
    shipment = serializers.SerializerMethodField()
    inspection_photos = serializers.SerializerMethodField()
    documents_signed_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'payment_paid', 'documents_signed_at', 
                           'inspection_completed_at', 'condition_report_signed_at', 'received_at_warehouse_at']
    
    def get_shipment(self, obj):
        if obj.shipment:
            return {
                'id': obj.shipment.id,
                'shipment_number': obj.shipment.shipment_number,
                'status': obj.shipment.status,
                'tracking_number': obj.shipment.tracking_number,
            }
        return None
    
    def get_inspection_photos(self, obj):
        """Get inspection photos (uploaded files)"""
        photos = []
        for i in range(1, 21):
            photo = getattr(obj, f'inspection_photo_{i}', None)
            if photo:
                photos.append({
                    'id': i,
                    'url': photo.url,
                    'field': f'inspection_photo_{i}'
                })
        
        # Also include legacy JSONField photos
        if obj.inspection_photos:
            for idx, photo_url in enumerate(obj.inspection_photos, start=len(photos) + 1):
                photos.append({
                    'id': idx,
                    'url': photo_url,
                    'field': 'legacy'
                })
        
        return photos
    
    def get_documents_signed_display(self, obj):
        """Get signed documents with details"""
        if not obj.documents_signed:
            return []
        
        signed_docs = []
        for doc_id, data in obj.documents_signed.items():
            try:
                doc = VehicleDocument.objects.get(id=doc_id)
                signed_docs.append({
                    'document_id': doc_id,
                    'name': doc.name,
                    'document_type': doc.document_type,
                    'signed_at': data.get('signed_at'),
                    'signature_data': data.get('signature_data', {})
                })
            except VehicleDocument.DoesNotExist:
                pass
        
        return signed_docs

