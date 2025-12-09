from django.urls import path
from . import views

urlpatterns = [
    path('create-checkout/', views.create_checkout_session, name='create-checkout'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
]

