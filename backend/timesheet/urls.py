from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, TimeRequestViewSet

router = DefaultRouter()
router.register(r'time-requests', TimeRequestViewSet, basename='time-request'),
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]