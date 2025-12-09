from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserPreference


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'warehouse_id', 'email_verified', 'is_staff', 'created_at']
    list_filter = ['email_verified', 'is_staff', 'is_superuser', 'created_at']
    search_fields = ['email', 'warehouse_id', 'first_name', 'last_name']
    ordering = ['-created_at']
    # Remove username from fieldsets
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('YuuSell Info', {'fields': ('warehouse_id', 'email_verified', 'email_verification_code', 'stripe_customer_id')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name'),
        }),
    )


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'language', 'currency', 'theme']

