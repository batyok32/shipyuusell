from django.urls import path
from . import views

urlpatterns = [
    path('address/', views.warehouse_address, name='warehouse-address'),
    path('labels/create/', views.create_warehouse_label, name='create-warehouse-label'),
    path('labels/', views.warehouse_labels_list, name='warehouse-labels-list'),
    path('pickup/schedule/', views.schedule_pickup, name='schedule-pickup'),
    path('pickup/', views.pickup_schedules_list, name='pickup-schedules-list'),
    path('receive-package/', views.receive_package, name='receive-package'),
]

