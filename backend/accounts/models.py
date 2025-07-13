from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Uses email as the unique identifier for authentication instead of username.
    """
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=False,  # we'll use email as the unique field
        blank=True,
        help_text=_('Optional.'),
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        error_messages={
            'unique': _("A user with that email already exists."),
        }
    )
    phone = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Optional.'),
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # username still collected, but not used for login

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.username
        
# accounts/models.py
from django.conf import settings
from django.db import models

class UserProfile(models.Model):
    MARITAL_CHOICES = [
        ('single',  'Single'),
        ('married', 'Married'),
        ('divorced','Divorced'),
        ('widowed', 'Widowed'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    birthday       = models.DateField(null=True, blank=True)
    marital_status = models.CharField(max_length=10, choices=MARITAL_CHOICES, blank=True)
    address        = models.CharField(max_length=255, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.username} Profile"
