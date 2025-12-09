from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'packages', views.PackageViewSet, basename='package')
router.register(r'shipments', views.ShipmentViewSet, basename='shipment')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate-shipping/', views.calculate_shipping, name='calculate-shipping'),
    path('proceed-with-quote/', views.proceed_with_quote, name='proceed-with-quote'),
    path('create-payment-session/', views.create_payment_session, name='create-payment-session'),
    path('shipments/<int:shipment_id>/generate-label/', views.generate_shipment_label, name='generate-shipment-label'),
    path('warehouse/address/', views.get_warehouse_address, name='get-warehouse-address'),
    path('warehouse/rates/', views.get_warehouse_rates, name='get-warehouse-rates'),
    path('warehouse/labels/create/', views.create_warehouse_label, name='create-warehouse-label'),
    path('shipments/<int:shipment_id>/track/', views.track_shipment, name='track-shipment'),
    path('track/<str:tracking_number>/', views.track_by_number, name='track-by-number'),
    path('countries/', views.countries_list, name='countries-list'),
    path('transport-modes/', views.transport_modes_list, name='transport-modes-list'),
    path('available-transport-modes/', views.available_transport_modes, name='available-transport-modes'),
    path('easyship-webhook/', views.easyship_webhook, name='easyship-webhook'),
    # Pickup management endpoints
    path('pickups/', views.list_pickup_requests, name='list-pickup-requests'),
    path('pickups/<int:pickup_id>/', views.get_pickup_request, name='get-pickup-request'),
    path('pickups/<int:pickup_id>/schedule/', views.schedule_pickup, name='schedule-pickup'),
    path('pickups/<int:pickup_id>/update-status/', views.update_pickup_status, name='update-pickup-status'),
    path('pickups/<int:pickup_id>/mark-delivered/', views.mark_pickup_delivered_to_warehouse, name='mark-pickup-delivered'),
    path('validate-address/', views.validate_address, name='validate-address'),
]

