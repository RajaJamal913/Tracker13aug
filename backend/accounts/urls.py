from django.urls import path

from accounts.serializers import UserProfileView
from .views import RegisterView, LoginView,WhoAmIView,UserListView, PersonalInfoView, PasswordChangeView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("whoami/",   WhoAmIView.as_view(),   name="whoami"),
    path("users/", UserListView.as_view(), name="user-list"),
     path("profile/", UserProfileView.as_view(), name="api-profile"),
      path('auth/personal/', PersonalInfoView.as_view(), name='personal-info'),
    path('auth/password/', PasswordChangeView.as_view(), name='password-change'),
]
