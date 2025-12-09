from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'requests', views.BuyingRequestViewSet, basename='buying-request')

urlpatterns = [
    # Preview quotes without creating request
    path('preview-quotes/', views.preview_quotes, name='preview-quotes'),
    # Custom create endpoint - use 'create' suffix to avoid conflict with ViewSet list endpoint
    path('requests/create/', views.create_buying_request, name='create-buying-request'),
    path('requests/<int:request_id>/quotes/', views.create_quotes, name='create-quotes'),
    path('requests/<int:request_id>/quotes/list/', views.get_quotes, name='get-quotes'),
    path('quotes/', views.list_all_quotes, name='list-all-quotes'),
    path('quotes/<int:quote_id>/approve/', views.approve_quote, name='approve-quote'),
    path('requests/<int:request_id>/mark-purchased/', views.mark_purchased, name='mark-purchased'),
    path('dashboard/', views.get_user_dashboard, name='user-dashboard'),
    # Router URLs - provides list (GET), retrieve (GET), create (POST), update, delete endpoints
    # Note: Custom create is at /requests/create/, ViewSet create at /requests/ will be disabled
    path('', include(router.urls)),
]

