from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from django.shortcuts import get_object_or_404
from rest_framework.authtoken.models import Token
from django.db import transaction

from .models import TwoFactor
from . import utils
from .serializers import (
    TwoFactorSetupSerializer,
    TwoFactorVerifySerializer,
    TwoFactorDisableSerializer,
    LoginWith2FASerializer,
)
from django.conf import settings

User = get_user_model()

ISSUER_NAME = getattr(settings, "TWOFACTOR_ISSUER_NAME", "MyProject")


class TwoFactorSetupView(APIView):
    """
    Start setup: generates temp_secret and returns otpauth_url and optionally a qr data-uri.
    Authenticated only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        # ensure the TwoFactor record exists
        tf, _ = TwoFactor.objects.get_or_create(user=user)
        # generate temp secret
        secret = utils.generate_base32_secret()
        tf.temp_secret = secret
        tf.save(update_fields=["temp_secret"])

        otpauth_url = utils.make_otpauth_url(secret, user_email=user.email, issuer=ISSUER_NAME)

        resp = {"otpauth_url": otpauth_url}

        # attempt to include a PNG data URI if qrcode is available
        try:
            qr_data_uri = utils.qrcode_data_uri_from_otpauth(otpauth_url)
            resp["qr_code_data_uri"] = qr_data_uri
        except Exception:
            # qrcode not installed — still fine; the client can open otpauth_url in a QR generator
            pass

        return Response(resp, status=status.HTTP_200_OK)


class TwoFactorVerifySetupView(APIView):
    """
    Verify the code for the temp_secret. If valid, enable 2FA for the user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"].strip()

        tf = get_object_or_404(TwoFactor, user=request.user)
        if not tf.temp_secret:
            return Response({"detail": "No pending 2FA setup found."}, status=status.HTTP_400_BAD_REQUEST)

        totp = utils.get_totp(tf.temp_secret)
        # allow small window for clock skew
        if not totp.verify(code, valid_window=1):
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        # enable and persist
        tf.enable(tf.temp_secret)
        return Response({"detail": "2FA enabled."}, status=status.HTTP_200_OK)


class TwoFactorDisableView(APIView):
    """
    Disable 2FA. Require current password and a valid TOTP code for safety.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.validated_data["password"]
        code = serializer.validated_data.get("code", "").strip()

        user = request.user
        if not user.check_password(password):
            return Response({"detail": "Password incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        tf = get_object_or_404(TwoFactor, user=user)
        if not tf.enabled or not tf.secret:
            return Response({"detail": "2FA not enabled."}, status=status.HTTP_400_BAD_REQUEST)

        totp = utils.get_totp(tf.secret)
        if not totp.verify(code, valid_window=1):
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)

        tf.disable()
        return Response({"detail": "2FA disabled."}, status=status.HTTP_200_OK)


class LoginWith2FAView(APIView):
    """
    Combined login endpoint that enforces 2FA when enabled for the user.
    Returns DRF Token (same model you use elsewhere).
    Body: { email, password, code? }
    - If user has 2FA enabled and no/invalid code submitted, returns 400 with { need_2fa: true }.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginWith2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]
        code = serializer.validated_data.get("code", "").strip()

        # Authenticate (case-insensitive lookup like your other code)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Do not reveal existence
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({"detail": "User account disabled."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user has 2FA enabled
        try:
            tf = user.twofactor
        except TwoFactor.DoesNotExist:
            tf = None

        if tf and tf.enabled:
            if not code:
                # Tell the client that 2FA code is required for this account
                return Response({"need_2fa": True, "detail": "Two-factor code required."}, status=status.HTTP_400_BAD_REQUEST)
            totp = utils.get_totp(tf.secret)
            if not totp.verify(code, valid_window=1):
                return Response({"detail": "Invalid two-factor code."}, status=status.HTTP_400_BAD_REQUEST)

        # create token (delete old to avoid duplicates like you did)
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)

        return Response({
            "token": token.key,
            "user": {"id": user.id, "username": user.username, "email": user.email}
        }, status=status.HTTP_200_OK)
