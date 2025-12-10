# accounts/urls.py
from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    WhoAmIView,
    UserListView,
    UserProfileView,
    PersonalInfoView,
    PasswordChangeView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
)

app_name = "accounts"

urlpatterns = [
    # auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),

    # convenience current-user endpoints
    path("whoami/", WhoAmIView.as_view(), name="whoami"),           # authenticated: returns id/username/email/phone/is_staff
    path("users/", UserListView.as_view(), name="user-list"),       # list minimal users (id, username)
    path("users/me/", UserProfileView.as_view(), name="user-profile"),  # GET / PATCH for current user's profile

    # personal profile (separate model)
    path("profile/personal/", PersonalInfoView.as_view(), name="personal-info"),

    # password change (authenticated)
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),

    # password reset (public)
    path("password/reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password/reset/verify/", PasswordResetVerifyView.as_view(), name="password-reset-verify"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
