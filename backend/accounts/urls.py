from django.urls import path

from accounts.serializers import UserProfileView
from .views import PasswordResetConfirmView, PasswordResetRequestView, PasswordResetVerifyView, RegisterView, LoginView,WhoAmIView,UserListView, PersonalInfoView, PasswordChangeView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("whoami/",   WhoAmIView.as_view(),   name="whoami"),
    path("users/", UserListView.as_view(), name="user-list"),
     path("profile/", UserProfileView.as_view(), name="api-profile"),
      path('auth/personal/', PersonalInfoView.as_view(), name='personal-info'),
    path('auth/password/', PasswordChangeView.as_view(), name='password-change'),
     path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/verify/", PasswordResetVerifyView.as_view(), name="password_reset_verify"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

]
