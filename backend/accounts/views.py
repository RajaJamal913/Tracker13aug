from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication, BasicAuthentication

from django.contrib.auth import get_user_model
from django.utils import timezone
import logging
import uuid

from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, UserProfileSerializer,
    PasswordResetRequestSerializer, PasswordResetVerifySerializer, PasswordResetConfirmSerializer,
    PersonalInfoSerializer, PasswordChangeSerializer, CurrentUserSerializer
)
from .models import UserProfile, PasswordResetOTP
from projects.models import Member, Invitation
from projects.utils import accept_invite_for_user
from shifts.utils import create_or_update_attendance_for

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, req, *args, **kwargs):
        serializer = self.get_serializer(data=req.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        invite_token = (
            req.data.get("invite")
            or req.data.get("invite_token")
            or req.data.get("token")
        )

        if invite_token:
            try:
                invite = (
                    Invitation.objects.select_related("project", "created_by")
                    .filter(token=invite_token)
                    .first()
                )

                if invite:
                    invite_email = getattr(invite, "email", None)
                    if invite_email and invite_email.lower() == (user.email or "").lower():
                        accept_invite_for_user(invite, user)
                    else:
                        logger.debug(
                            "Invite token provided at registration but emails did not match (token=%s invite_email=%s user_email=%s). Ignoring acceptance.",
                            invite_token,
                            invite_email,
                            user.email,
                        )
                else:
                    logger.debug("No invitation found for token=%s during registration", invite_token)
            except Exception:
                logger.exception("Error processing invite token=%s for new user=%s", invite_token, getattr(user, "pk", None))

        return Response({
            "user": {"id": user.id, "username": user.username, "email": user.email}
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            logger.debug("Login validation errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]

        # Clean up existing tokens and create a new one
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)

        # --- record attendance for this login event ---
        try:
            member = Member.objects.get(user=user)
            create_or_update_attendance_for(member, detected_dt=timezone.now())
        except Member.DoesNotExist:
            logger.debug("No Member record for user %s; skipping attendance.", user.username)
        except Exception:
            logger.exception("Failed to create attendance for user %s on login.", user.username)
        # --- end attendance block ---

        # Handle invitation acceptance for existing user
        invite_token = (
            request.data.get("invite") or
            request.data.get("invite_token") or
            request.data.get("token")
        )

        if invite_token:
            try:
                invite = Invitation.objects.select_related("project", "created_by").filter(token=invite_token).first()
                if invite:
                    invite_email = getattr(invite, "email", None)
                    if invite_email and invite_email.lower() == (user.email or "").lower():
                        accept_invite_for_user(invite, user)
                        logger.info(
                            "Invite accepted for existing user %s with token %s",
                            user.username,
                            invite_token
                        )
                    else:
                        logger.debug(
                            "Invite token provided but email mismatch (token=%s, invite_email=%s, user_email=%s)",
                            invite_token, invite_email, user.email
                        )
                else:
                    logger.debug("No invitation found for token=%s during login", invite_token)
            except Exception:
                logger.exception("Error processing invite token=%s for existing user=%s", invite_token, user.username)

        return Response({
            "token": token.key,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        })


class WhoAmIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": getattr(user, 'phone', None),
            "is_staff": user.is_staff,
        })


class UserListView(generics.ListAPIView):
    queryset = User.objects.only("id", "username")
    serializer_class = UserSerializer


class UserProfileView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PersonalInfoView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Password changed successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        try:
            user = User.objects.filter(email__iexact=email).first()
        except Exception:
            user = None

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
                logger.exception("Failed to send password reset email to %s: %s", email, str(e))
                return Response({"detail": "Unable to send email right now."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"detail": "If that email exists we sent a code."}, status=status.HTTP_200_OK)


class PasswordResetVerifyView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"].strip()

        otp = PasswordResetOTP.objects.filter(email=email, code=code, used=False).order_by("-created_at").first()
        if not otp or not otp.is_valid():
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        otp.used = True
        token = uuid.uuid4()
        otp.reset_token = token
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

        otp = PasswordResetOTP.objects.filter(email=email, reset_token=reset_token).order_by("-created_at").first()
        if not otp or (timezone.now() > otp.expires_at):
            return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Password reset completed."}, status=status.HTTP_200_OK)

        user.set_password(new_password)
        user.save()

        otp.reset_token = None
        otp.used = True
        otp.save(update_fields=["reset_token", "used"])

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)

