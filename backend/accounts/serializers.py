from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserPreference


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'warehouse_id', 'email_verified', 
                  'phone', 'first_name', 'last_name', 'created_at']
        read_only_fields = ['id', 'warehouse_id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'phone']
        extra_kwargs = {
            'email': {'required': True},
        }
    
    def create(self, validated_data):
        # Username is not used - email is the authentication field
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Try email-based authentication first
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            # If that doesn't work, try with email as keyword argument
            if not user:
                user = authenticate(
                    request=self.context.get('request'),
                    email=email,
                    password=password
                )
            
            if not user:
                raise serializers.ValidationError({
                    'non_field_errors': ['Invalid email or password.']
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': ['User account is disabled.']
                })
            
            attrs['user'] = user
        else:
            missing = []
            if not email:
                missing.append('email')
            if not password:
                missing.append('password')
            raise serializers.ValidationError({
                'non_field_errors': [f'Must include {", ".join(missing)}.']
            })
        
        return attrs

