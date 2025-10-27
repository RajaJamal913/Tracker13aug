from django.contrib import admin
from .models import TwoFactor

@admin.register(TwoFactor)
class TwoFactorAdmin(admin.ModelAdmin):
    list_display = ("user", "enabled", "created_at", "confirmed_at")
    search_fields = ("user__email", "user__username")
