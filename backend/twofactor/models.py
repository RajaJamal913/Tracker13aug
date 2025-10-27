from django.db import models
from django.conf import settings
from django.utils import timezone

class TwoFactor(models.Model):
    """
    Stores TOTP secret and enabled state for a user.
    temp_secret used during setup until user verifies a code.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="twofactor")
    secret = models.CharField(max_length=64, blank=True, null=True)       # base32 secret when enabled
    temp_secret = models.CharField(max_length=64, blank=True, null=True)  # temporary secret while setting up
    enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"2FA for {self.user.email} (enabled={self.enabled})"

    def enable(self, secret: str):
        self.secret = secret
        self.temp_secret = None
        self.enabled = True
        self.confirmed_at = timezone.now()
        self.save(update_fields=["secret", "temp_secret", "enabled", "confirmed_at"])

    def disable(self):
        self.secret = None
        self.temp_secret = None
        self.enabled = False
        self.confirmed_at = None
        self.save(update_fields=["secret", "temp_secret", "enabled", "confirmed_at"])
