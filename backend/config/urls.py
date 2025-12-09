"""
URL configuration for yuusell_logistics project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="YuuSell Logistics API",
      default_version='v1',
      description="Comprehensive international logistics and freight forwarding platform API",
      terms_of_service="https://logistics.yuusell.com/terms/",
      contact=openapi.Contact(email="api@logistics.yuusell.com"),
      license=openapi.License(name="Proprietary"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/logistics/', include('logistics.urls')),
    path('api/v1/warehouse/', include('warehouse.urls')),
    path('api/v1/buying/', include('buying.urls')),
    path('api/v1/vehicles/', include('vehicles.urls')),
    path('api/v1/payments/', include('payments.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

