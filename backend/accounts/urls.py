from django.urls import path
from . import views
from . import oauth_views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('verify-email/', views.verify_email, name='verify-email'),
    path('resend-verification-code/', views.resend_verification_code, name='resend-verification-code'),
    path('password-reset/request/', views.request_password_reset, name='request-password-reset'),
    path('password-reset/confirm/', views.confirm_password_reset, name='confirm-password-reset'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('google/', oauth_views.google_login, name='google-login'),
    path('facebook/', oauth_views.facebook_login, name='facebook-login'),
]

