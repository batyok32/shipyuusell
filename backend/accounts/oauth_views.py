"""
OAuth authentication views for Google and Facebook
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import get_user_model
import requests
import json
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Handle Google OAuth login/signup"""
    access_token = request.data.get('access_token')
    
    if not access_token:
        return Response(
            {'error': 'Access token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify token with Google
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        if response.status_code != 200:
            return Response(
                {'error': 'Invalid Google token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        google_data = response.json()
        email = google_data.get('email')
        first_name = google_data.get('given_name', '')
        last_name = google_data.get('family_name', '')
        picture = google_data.get('picture', '')
        google_id = google_data.get('id')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create user
        try:
            user = User.objects.get(email=email)
            # Update user info if needed
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            user.email_verified = True  # OAuth emails are pre-verified
            user.save()
        except User.DoesNotExist:
            # Create new user (username not used - email is the authentication field)
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                email_verified=True,  # OAuth emails are pre-verified
                is_active=True
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'warehouse_id': user.warehouse_id,
                'email_verified': user.email_verified,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Google OAuth error: {str(e)}")
        return Response(
            {'error': 'Failed to verify Google token'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        return Response(
            {'error': 'An error occurred during Google login'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def facebook_login(request):
    """Handle Facebook OAuth login/signup"""
    access_token = request.data.get('access_token')
    
    if not access_token:
        return Response(
            {'error': 'Access token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify token with Facebook
        app_id = settings.FACEBOOK_APP_ID
        app_secret = settings.FACEBOOK_APP_SECRET
        
        # First verify the token
        verify_url = f'https://graph.facebook.com/debug_token'
        verify_params = {
            'input_token': access_token,
            'access_token': f'{app_id}|{app_secret}'
        }
        
        verify_response = requests.get(verify_url, params=verify_params, timeout=10)
        
        if verify_response.status_code != 200:
            return Response(
                {'error': 'Invalid Facebook token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user info
        user_url = 'https://graph.facebook.com/me'
        user_params = {
            'access_token': access_token,
            'fields': 'id,name,email,first_name,last_name,picture'
        }
        
        user_response = requests.get(user_url, params=user_params, timeout=10)
        
        if user_response.status_code != 200:
            return Response(
                {'error': 'Failed to get Facebook user info'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        facebook_data = user_response.json()
        email = facebook_data.get('email')
        name = facebook_data.get('name', '')
        first_name = facebook_data.get('first_name', name.split()[0] if name else '')
        last_name = facebook_data.get('last_name', ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '')
        facebook_id = facebook_data.get('id')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Facebook. Please grant email permission.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create user
        try:
            user = User.objects.get(email=email)
            # Update user info if needed
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            user.email_verified = True  # OAuth emails are pre-verified
            user.save()
        except User.DoesNotExist:
            # Create new user (username not used - email is the authentication field)
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                email_verified=True,  # OAuth emails are pre-verified
                is_active=True
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'warehouse_id': user.warehouse_id,
                'email_verified': user.email_verified,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Facebook OAuth error: {str(e)}")
        return Response(
            {'error': 'Failed to verify Facebook token'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Facebook login error: {str(e)}")
        return Response(
            {'error': 'An error occurred during Facebook login'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

