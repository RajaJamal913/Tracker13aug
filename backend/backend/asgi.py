"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_asgi_application()
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from realtimemonitoring.consumers import MemberStatusConsumer

application = ProtocolTypeRouter({
    "websocket": URLRouter([
        path("ws/monitor/member/<int:member_id>/", MemberStatusConsumer.as_asgi()),
    ])
})
