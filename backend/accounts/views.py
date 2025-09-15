from rest_framework import generics, status,permissions
from rest_framework.response import Response
from .serializers import RegisterSerializer, LoginSerializer,UserSerializer
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication, SessionAuthentication, BasicAuthentication
from .serializers import UserProfileSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authentication import TokenAuthentication, SessionAuthentication, BasicAuthentication
from .models import UserProfile
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from .models import PasswordResetOTP
from .serializers import (
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
    PersonalInfoSerializer, 
    PasswordChangeSerializer
)
from django.contrib.auth import get_user_model
import uuid

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token


# Set up logging
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, req, *args, **kwargs):
        serializer = self.get_serializer(data=req.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
       
        return Response({
            
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
        }, status=status.HTTP_201_CREATED)

# views.py
from rest_framework.authtoken.models import Token

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print("Validation errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data["user"]
        
        # Clean up existing tokens
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        
        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
        })

class WhoAmIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "is_staff": user.is_staff,
        })
User = get_user_model()
class UserListView(generics.ListAPIView):
    queryset = User.objects.only("id","username")
    serializer_class = UserSerializer


class UserProfileView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
# accounts/views.py


class PersonalInfoView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes     = [permissions.IsAuthenticated]

    def get(self, request):
        # create on the fly if missing
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = PersonalInfoSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = PersonalInfoSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordChangeView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes     = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Password changed successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# views.py (PasswordResetRequestView)
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

class PasswordResetRequestView(APIView):
    permission_classes = []  # Allow any
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        try:
            user = User.objects.filter(email__iexact=email).first()
        except Exception:
            user = None

        # Create OTP atomically
        with transaction.atomic():
            otp = PasswordResetOTP.generate_code(email, ttl_minutes=10)

            subject = "Your password reset code"
            message = (
                f"Your verification code is: {otp.code}\n"
                f"It expires at {otp.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                "If you did not request this, ignore."
            )
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")
            recipient = [email]
            try:
                sent = send_mail(subject, message, from_email, recipient, fail_silently=False)
                logger.info("Password reset email sent to %s (sent=%s). OTP id=%s", email, sent, otp.id)
            except Exception as e:
                # log full exception — useful for SMTP misconfigurations
                logger.exception("Failed to send password reset email to %s: %s", email, str(e))
                # don't reveal details to caller
                return Response({"detail": "Unable to send email right now."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"detail": "If that email exists we sent a code."}, status=status.HTTP_200_OK)


class PasswordResetVerifyView(APIView):
    permission_classes = []
    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"].strip()

        # find latest matching OTP that is not used and not expired
        try:
            otp = PasswordResetOTP.objects.filter(email=email, code=code, used=False).order_by("-created_at").first()
        except PasswordResetOTP.DoesNotExist:
            otp = None

        if not otp or not otp.is_valid():
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        # mark used and issue a reset token (short-lived)
        otp.used = True
        token = uuid.uuid4()
        otp.reset_token = token
        # set a tighter expiry for token (e.g., 15 minutes from now)
        otp.expires_at = timezone.now() + timezone.timedelta(minutes=15)
        otp.save(update_fields=["used", "reset_token", "expires_at"])

        return Response({"reset_token": str(token)}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = []
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        reset_token = serializer.validated_data["reset_token"]
        new_password = serializer.validated_data["new_password"]

        # locate OTP record with matching token and email
        otp = PasswordResetOTP.objects.filter(email=email, reset_token=reset_token).order_by("-created_at").first()
        if not otp or (timezone.now() > otp.expires_at):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        # reset password for user if exists
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # For security, respond with generic message but do not crash
            return Response({"detail": "Password reset completed."}, status=status.HTTP_200_OK)

        user.set_password(new_password)
        user.save()

        # invalidate the token
        otp.reset_token = None
        otp.used = True
        otp.save(update_fields=["reset_token", "used"])

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
