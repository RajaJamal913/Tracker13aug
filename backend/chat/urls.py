from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ChannelViewSet, DirectMessageViewSet, MessageViewSet
from django.conf import settings
from django.conf.urls.static import static
router = DefaultRouter()
router.register(r"channels", ChannelViewSet, basename="chat-channels")
router.register(r"messages", MessageViewSet, basename="chat-messages")
router.register(r"direct-messages", DirectMessageViewSet, basename="direct-messages")

urlpatterns = [
    path("", include(router.urls)),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)