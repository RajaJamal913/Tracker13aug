# chat/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/dm/?$", consumers.DMConsumer.as_asgi()),  # global DM ws endpoint: /ws/dm?token=...
]
