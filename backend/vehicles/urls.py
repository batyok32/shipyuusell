from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate-pricing/', views.calculate_vehicle_pricing, name='calculate-vehicle-pricing'),
    path('documents/', views.get_documents_to_sign, name='get-documents-to-sign'),
    path('sign-documents/', views.sign_documents, name='sign-documents'),
    path('create/', views.create_vehicle_request, name='create-vehicle-request'),
    path('<int:vehicle_id>/payment/', views.create_payment_session, name='create-vehicle-payment'),
    path('<int:vehicle_id>/inspection/', views.submit_inspection, name='submit-inspection'),
    path('<int:vehicle_id>/sign-report/', views.sign_condition_report, name='sign-condition-report'),
    path('<int:vehicle_id>/receive/', views.receive_vehicle_at_warehouse, name='receive-vehicle-at-warehouse'),
]

