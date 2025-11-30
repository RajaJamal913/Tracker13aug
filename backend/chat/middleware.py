# chat/middleware.py
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

class TokenAuthMiddleware:
    """
    Token auth middleware for Channels.
    Expects ?token=<token> in websocket URL (dev-friendly).
    Sets scope['user'] to the token user or AnonymousUser.
    """
    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        query_string = scope.get("query_string", b"").decode()
        qs = parse_qs(query_string)
        token_list = qs.get("token") or qs.get("auth_token") or []
        user = None
        if token_list:
            token_key = token_list[0]
            try:
                token = Token.objects.select_related("user").get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                user = None
        scope["user"] = user
        return self.inner(scope)
