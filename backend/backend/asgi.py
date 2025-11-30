# backend/asgi.py
import os
import django
from django.core.asgi import get_asgi_application

from channels.routing import ProtocolTypeRouter, URLRouter

# import your token middleware and websocket routing
from chat.middleware import TokenAuthMiddleware         # ensure import path is correct
import chat.routing                                   # must expose websocket_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

# normal Django ASGI app for HTTP
django_asgi_app = get_asgi_application()

# Single ProtocolTypeRouter: HTTP + WebSocket
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # Wrap URLRouter with your TokenAuthMiddleware so `scope['user']` is set from ?token=...
    # That middleware is synchronous in your repo so calling it directly is fine.
    "websocket": TokenAuthMiddleware(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
