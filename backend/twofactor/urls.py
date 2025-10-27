from django.urls import path
from .views import (
    TwoFactorSetupView,
    TwoFactorVerifySetupView,
    TwoFactorDisableView,
    LoginWith2FAView,
)

urlpatterns = [
    path("setup/", TwoFactorSetupView.as_view(), name="twofactor-setup"),
    path("verify-setup/", TwoFactorVerifySetupView.as_view(), name="twofactor-verify-setup"),
    path("disable/", TwoFactorDisableView.as_view(), name="twofactor-disable"),
    path("login-2fa/", LoginWith2FAView.as_view(), name="login-with-2fa"),
]
