from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
import random
import string
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

User = get_user_model()


def generate_verification_code():
    """Generate 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """User registration with email verification"""
    serializer = RegisterSerializer(data=request.data)
    print("Request data", request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate verification code
        code = generate_verification_code()
        user.email_verification_code = code
        user.save()
        
        # Send verification email
        send_mail(
            subject='YuuSell Logistics - Email Verification',
            message=f'Your verification code is: {code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({
            'message': 'Registration successful. Please verify your email.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    print("Serializer errors", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email(request):
    """Verify email with code"""
    email = request.data.get('email')
    code = request.data.get('code')
    
    try:
        user = User.objects.get(email=email)
        if user.email_verification_code == code:
            user.email_verified = True
            user.email_verification_code = None
            user.save()
            
            # Return JWT tokens after successful verification
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Email verified successfully',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resend_verification_code(request):
    """Resend verification code to user's email"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
        
        # Don't resend if already verified
        if user.email_verified:
            return Response(
                {'error': 'Email is already verified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new verification code
        code = generate_verification_code()
        user.email_verification_code = code
        user.save()
        
        # Send verification email
        send_mail(
            subject='YuuSell Logistics - Email Verification Code',
            message=f'Your verification code is: {code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({
            'message': 'Verification code sent successfully. Please check your email.'
        })
    except User.DoesNotExist:
        # Don't reveal if user exists or not for security
        return Response({
            'message': 'If an account with that email exists, a verification code has been sent.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': 'Failed to send verification code. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """User login"""
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Check if email is verified
        if not user.email_verified:
            return Response({
                'error': 'Email not verified',
                'email': user.email,
                'requires_verification': True
            }, status=status.HTTP_403_FORBIDDEN)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update user profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def request_password_reset(request):
    """Request password reset - send email with reset link"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
        
        # Generate token and uid
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Create reset URL (frontend URL)
        # Django tokens are URL-safe (base36), so no encoding needed
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"
        
        # Prepare email content
        plain_message = f'''You requested a password reset for your YuuSell Logistics account.

Click the link below to reset your password:
{reset_url}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email.

Best regards,
YuuSell Logistics Team
'''
        
        html_message = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 24px;
            background-color: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .button:hover {{
            background-color: #ea580c;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your YuuSell Logistics account.</p>
    <p>Click the button below to reset your password:</p>
    <p style="text-align: center;">
        <a href="{reset_url}" class="button">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; font-size: 12px;">{reset_url}</p>
    <p><strong>This link will expire in 24 hours.</strong></p>
    <p>If you did not request this password reset, please ignore this email.</p>
    <div class="footer">
        <p>Best regards,<br>YuuSell Logistics Team</p>
    </div>
</body>
</html>
'''
        
        # Send email with both plain text and HTML
        send_mail(
            subject='YuuSell Logistics - Password Reset',
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({
            'message': 'Password reset email sent. Please check your inbox.'
        }, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        # Don't reveal if user exists or not for security
        return Response({
            'message': 'If an account with that email exists, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': 'Failed to send password reset email. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def confirm_password_reset(request):
    """Confirm password reset with token"""
    from urllib.parse import unquote
    import logging
    
    logger = logging.getLogger(__name__)
    
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not all([uid, token, new_password]):
        return Response(
            {'error': 'uid, token, and new_password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Clean token: remove any whitespace and line breaks
    # Handle quoted-printable encoding artifacts (trailing = followed by line break)
    token = token.strip().replace('=\n', '').replace('=\r\n', '').replace('=\r', '')
    token = token.replace('\n', '').replace('\r', '').strip()
    # Remove trailing = if it's a quoted-printable artifact (Django tokens don't end with =)
    if token.endswith('='):
        token = token.rstrip('=')
    
    if len(new_password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Token should be passed as-is from frontend (Next.js handles URL decoding)
        # Decode user ID
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
        except (TypeError, ValueError, OverflowError) as e:
            logger.error(f"Failed to decode uid: {uid}, error: {str(e)}")
            return Response(
                {'error': 'Invalid reset link: Unable to decode user ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            logger.error(f"User not found for uid: {uid}")
            return Response(
                {'error': 'Invalid reset link: User not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify token
        if not default_token_generator.check_token(user, token):
            logger.warning(f"Password reset token validation failed for user {user.email}. Token: {token[:10]}..., UID: {uid}")
            return Response(
                {'error': 'Invalid or expired reset token. The link may have expired or already been used. Please request a new password reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        logger.info(f"Password reset successful for user {user.email}")
        return Response({
            'message': 'Password has been reset successfully. You can now login with your new password.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}", exc_info=True)
        return Response(
            {'error': 'Failed to reset password. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

