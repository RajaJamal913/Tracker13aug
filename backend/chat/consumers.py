# chat/consumers.py
import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from projects.models import Member

User = get_user_model()

class DMConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for direct messages.
    Expects token in query string, e.g. ws://.../ws/dm?token=<token>
    On connect: validate token -> find user -> find Member record -> add to group "dm_<member_pk>".
    On disconnect: remove from that group.
    """

    async def connect(self):
        # parse token
        qs = parse_qs(self.scope.get("query_string").decode())
        token_vals = qs.get("token") or qs.get("authToken") or qs.get("access_token") or []
        token = token_vals[0] if token_vals else None

        self.member = None
        if token:
            try:
                user = await database_sync_to_async(lambda: Token.objects.get(key=token).user)()
                # Find a Member record for this user
                member = await database_sync_to_async(lambda: Member.objects.filter(user=user).first())()
                if member:
                    self.member = member
            except Exception:
                self.member = None

        if not self.member:
            # reject the connection if no member found (optional: allow anonymous read-only)
            await self.close(code=4001)
            return

        # group name based on member pk
        self.group_name = f"dm_{self.member.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass

    # Handler for messages sent to group by server code (type: "chat.message")
    async def chat_message(self, event):
        """
        event should contain 'message' which is a JSON-serializable dict representing the message.
        We'll forward it over the socket.
        """
        message = event.get("message")
        if message is None:
            return
        await self.send(text_data=json.dumps(message))
