from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import random
import string


def generate_warehouse_id():
    """Generate unique warehouse ID like JS-12345"""
    prefix = 'JS'
    number = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{number}"


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a user with the given email and password"""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Extended User model with warehouse and profile information"""
    # Override username to make it unused (Django requires it but we use email instead)
    username = models.CharField(max_length=150, blank=True, null=True, unique=False)
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, null=True, blank=True)
    warehouse_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email as the username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # No required fields since email is the username
    
    objects = UserManager()
    
    def save(self, *args, **kwargs):
        # Generate warehouse ID if not set
        if not self.warehouse_id:
            while True:
                warehouse_id = generate_warehouse_id()
                if not User.objects.filter(warehouse_id=warehouse_id).exists():
                    self.warehouse_id = warehouse_id
                    break
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.email


class UserPreference(models.Model):
    """User preferences and settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    language = models.CharField(max_length=10, default='en')
    currency = models.CharField(max_length=3, default='USD')
    notifications_email = models.BooleanField(default=True)
    notifications_sms = models.BooleanField(default=False)
    theme = models.CharField(max_length=10, choices=[('light', 'Light'), ('dark', 'Dark')], default='light')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

