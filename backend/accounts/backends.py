from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to login with email instead of username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Get email from kwargs or use username parameter as email
        email = kwargs.get('email') or username
        
        if email is None or password is None:
            return None
        
        try:
            # Try to find user by email
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Run the default password hasher once to reduce timing difference
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Multiple users with same email shouldn't happen, but handle it
            user = User.objects.filter(email=email).first()
        
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
