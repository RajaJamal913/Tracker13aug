# views.py
import logging
from django.db import transaction
from django.db.models import Q, Count
from django.core.exceptions import FieldError
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authentication import TokenAuthentication, SessionAuthentication

from .models import Project, Member, Invitation, Team
from .serializers import (
    ProjectSerializer,
    MemberSerializer,
    InvitationSerializer,
    TeamSerializer,
    MemberUpdateSerializer,
)

logger = logging.getLogger(__name__)
User = None
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None

# Optional import for Simple JWT (if installed). Fall back gracefully.
JWTAuthentication = None
try:
    from rest_framework_simplejwt.authentication import JWTAuthentication as _JWTAuthentication
    JWTAuthentication = _JWTAuthentication
except Exception:
    JWTAuthentication = None


def assign_user_to_project(project: Project, user):
    """
    Ensure a Member exists for the user and attach to project (idempotent).
    """
    member_obj, created = Member.objects.get_or_create(user=user)
    project.members.add(member_obj)
    project.save()
    return member_obj


class ProjectCreateView(generics.CreateAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        assign_user_to_project(project, self.request.user)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.debug("ProjectCreate errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectListView(generics.ListAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Project.objects.none()

        return (
            Project.objects.filter(Q(created_by=user) | Q(members__user=user))
            .annotate(tasks_count=Count("tasks"))
            .distinct()
        )


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Project.objects.none()
        return Project.objects.filter(Q(created_by=user) | Q(members__user=user)).distinct().annotate(tasks_count=Count("tasks"))

# views.py — replace get_members with this implementation
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(["GET"])
@permission_classes([IsAuthenticated])  # require auth so we can filter by current user
def get_members(request):
    """
    GET /api/members/?invited_by_me=1
    GET /api/members/?project_id=<id>

    Returns Member records (serialized) limited to:
     - members who accepted invites created by the current user (if invited_by_me=1)
     - members attached to the given project (if project_id provided and user has access)
     - otherwise members that belong to projects the current user is part of (safe default)
    """
    user = request.user
    invited_by_me = request.query_params.get("invited_by_me")
    project_id = request.query_params.get("project_id")

    members_qs = Member.objects.none()

    # 1) If asked for members accepted from invites created by me
    if invited_by_me and invited_by_me.lower() in ("1", "true", "yes"):
        # Invitations created_by = user and accepted_by is set OR accepted_at not null OR accepted == True
        invites = Invitation.objects.filter(created_by=user).filter(
            Q(accepted_by__isnull=False) | Q(accepted_at__isnull=False) | Q(accepted=True)
        )
        # Use emails or accepted_by to find Member objects
        accepted_user_ids = list(invites.values_list("accepted_by_id", flat=True))
        accepted_emails = list(invites.values_list("email", flat=True))
        member_filter = Q()
        if accepted_user_ids:
            member_filter |= Q(user__id__in=[x for x in accepted_user_ids if x])
        if accepted_emails:
            member_filter |= Q(user__email__in=accepted_emails)
        if member_filter.children:
            members_qs = Member.objects.select_related("user").filter(member_filter).distinct()

        serializer = MemberSerializer(members_qs, many=True)
        return Response(serializer.data)

    # 2) If project_id specified -> return project's members if user can see project
    if project_id:
        try:
            project = Project.objects.get(pk=int(project_id))
        except (Project.DoesNotExist, ValueError):
            return Response([], status=status.HTTP_200_OK)

        # Check that requesting user is allowed to see this project
        if not (project.created_by_id == user.id or project.members.filter(user=user).exists()):
            return Response([], status=status.HTTP_403_FORBIDDEN)

        members_qs = Member.objects.filter(projects__id=project.id).select_related("user").distinct()
        serializer = MemberSerializer(members_qs, many=True)
        return Response(serializer.data)

    # 3) Default: members that appear in projects the current user owns or is a member of
    members_qs = Member.objects.filter(Q(projects__created_by=user) | Q(projects__members__user=user)).select_related("user").distinct()
    serializer = MemberSerializer(members_qs, many=True)
    return Response(serializer.data)

class ProjectMemberListView(generics.ListAPIView):
    """
    GET /api/projects/<pk>/members/  →  [ { id, user, role, username }, … ]
    """
    serializer_class = MemberSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        project_id = self.kwargs.get("pk")
        return Member.objects.filter(projects__id=project_id).select_related("user")


class InvitationListCreateView(generics.ListCreateAPIView):
    """
    GET /api/invites/ -> list invites relevant to the current user (created_by or for projects they belong to)
    POST /api/invites/ -> create invite (created_by is set to request.user)
    """
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Invitation.objects.filter(
            Q(created_by=user) | Q(project__created_by=user) | Q(project__members__user=user)
        ).distinct().select_related("project", "created_by")

    def _mark_invite_accepted_for_user(self, invitation, user):
        """
        Ensure invitation fields reflect acceptance and attach the user as a Member to the project.
        Defensive: works with different invitation field names (accepted / accepted_at / accepted_by / mark_accepted).
        """
        try:
            with transaction.atomic():
                # Ensure Member record exists for this user
                member_obj, _ = Member.objects.get_or_create(user=user, defaults={"role": getattr(invitation, "role", "")})

                # Attach to project if present
                if getattr(invitation, "project", None):
                    invitation.project.members.add(member_obj)

                changed = False
                # set accepted_by if present
                if hasattr(invitation, "accepted_by"):
                    try:
                        invitation.accepted_by = user
                        changed = True
                    except Exception:
                        logger.exception("failed to set accepted_by on invite %s", invitation.pk)
                # set accepted_at if present
                if hasattr(invitation, "accepted_at"):
                    try:
                        from django.utils import timezone
                        invitation.accepted_at = timezone.now()
                        changed = True
                    except Exception:
                        logger.exception("failed to set accepted_at on invite %s", invitation.pk)
                # set boolean accepted/accepted flag if present
                if hasattr(invitation, "accepted"):
                    try:
                        invitation.accepted = True
                        changed = True
                    except Exception:
                        logger.exception("failed to set accepted on invite %s", invitation.pk)
                if hasattr(invitation, "is_accepted"):
                    try:
                        invitation.is_accepted = True
                        changed = True
                    except Exception:
                        logger.exception("failed to set is_accepted on invite %s", invitation.pk)

                # Prefer a model helper if present
                try:
                    if hasattr(invitation, "mark_accepted") and callable(invitation.mark_accepted):
                        invitation.mark_accepted()
                    elif changed:
                        invitation.save()
                except Exception:
                    logger.exception("mark_accepted/save failed for invite %s", invitation.pk)
        except Exception:
            logger.exception("Error auto-accepting invite id=%s for user=%s", getattr(invitation, "pk", None), getattr(user, "pk", None))

    def perform_create(self, serializer):
        """
        Create project+invite (if requested) and save invitation.
        After creation, if the invitation email matches an existing user, accept it immediately.
        """
        request = self.request
        data = getattr(request, "data", {}) or {}
        create_project_flag = data.get("create_project") or data.get("createProject") or False
        project_name = data.get("project_name") or data.get("projectName") or None

        # If create_project requested, create project then attach invitation to it
        if create_project_flag:
            if not project_name or str(project_name).strip() == "":
                raise ValueError("project_name is required when create_project is true")

            with transaction.atomic():
                project = Project.objects.create(name=str(project_name).strip(), created_by=request.user)
                assign_user_to_project(project, request.user)

                invitation = serializer.save(created_by=request.user, project=project)

                # If the invited email matches an existing user, accept immediately
                try:
                    if getattr(invitation, "email", None):
                        existing_user = None
                        try:
                            existing_user = User.objects.filter(email__iexact=invitation.email).first()
                        except Exception:
                            existing_user = None
                        if existing_user:
                            self._mark_invite_accepted_for_user(invitation, existing_user)

                except Exception:
                    logger.exception("Auto-accept check failed after creating invite id=%s", getattr(invitation, "pk", None))

                # attempt to send email but don't fail creation if send fails
                try:
                    from .utils import send_invite_email_plain
                    send_invite_email_plain(invitation)
                except Exception:
                    logger.exception("Failed to send invite email for invitation id=%s", getattr(invitation, "pk", None))

        else:
            # Standard behavior: save invite
            invitation = serializer.save(created_by=self.request.user)

            # If the invited email matches an existing user, accept it immediately
            try:
                if getattr(invitation, "email", None):
                    existing_user = None
                    try:
                        existing_user = User.objects.filter(email__iexact=invitation.email).first()
                    except Exception:
                        existing_user = None
                    if existing_user:
                        self._mark_invite_accepted_for_user(invitation, existing_user)
            except Exception:
                logger.exception("Auto-accept check failed after creating invite id=%s", getattr(invitation, "pk", None))

            try:
                from .utils import send_invite_email_plain
                send_invite_email_plain(invitation)
            except Exception:
                logger.exception("Failed to send invite email for invitation id=%s", getattr(invitation, "pk", None))

class AcceptInvitationView(APIView):
    """
    POST /api/invites/accept/  { "token": "..." }  -> accepts invite (if authenticated)
    GET  /api/invites/accept/?token=...           -> returns invite metadata (no change)
    """
    permission_classes = [AllowAny]
    # Accept TokenAuth, SessionAuth and (optionally) JWT auth if installed
    authentication_classes = [TokenAuthentication, SessionAuthentication] + ([JWTAuthentication] if JWTAuthentication else [])

    def _get_invitation(self, token: str):
        try:
            return Invitation.objects.select_related("project", "created_by").get(token=token)
        except Invitation.DoesNotExist:
            return None

    def post(self, request):
        token = (
            request.data.get("token")
            or request.data.get("invite")
            or request.query_params.get("token")
            or request.query_params.get("invite")
        )

        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        logger.debug(
            "AcceptInvitation called by user=%s authenticated=%s auth_header=%s",
            getattr(request.user, "username", "ANON"),
            getattr(request.user, "is_authenticated", False),
            auth_header,
        )

        if not token:
            return Response({"detail": "token required"}, status=status.HTTP_400_BAD_REQUEST)

        invite = self._get_invitation(token)
        if invite is None:
            return Response({"detail": "invalid token"}, status=status.HTTP_404_NOT_FOUND)

        # Validate token / not already accepted
        try:
            valid = True
            if hasattr(invite, "is_valid") and callable(invite.is_valid):
                valid = invite.is_valid()
            else:
                already_accepted = False
                for f in ("is_accepted", "accepted", "accepted_at", "accepted_on"):
                    if hasattr(invite, f):
                        val = getattr(invite, f)
                        if isinstance(val, bool) and val:
                            already_accepted = True
                        # any timestamp-like field set implies accepted
                        if val is not None and not (isinstance(val, bool) and val is False):
                            if f.endswith("_at") or f.endswith("_on"):
                                already_accepted = True
                valid = not already_accepted
        except Exception:
            valid = True

        if not valid:
            return Response({"detail": "token expired or already used"}, status=status.HTTP_400_BAD_REQUEST)

        # Authenticated acceptance
        if request.user and request.user.is_authenticated:
            user = request.user
            try:
                with transaction.atomic():
                    # Ensure Member record exists for this user
                    member_obj, created = Member.objects.get_or_create(
                        user=user, defaults={"role": getattr(invite, "role", "")}
                    )

                    # Attach the member to the project if present
                    if invite.project:
                        invite.project.members.add(member_obj)
                    else:
                        logger.warning(
                            "Invite %s has no project attached; cannot add member to project", getattr(invite, "pk", None)
                        )

                    # Prefer model helper mark_accepted if available
                    try:
                        if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                            # call with the accepting user so the model sets accepted_by/accepted_at consistently
                            try:
                                # Some mark_accepted implementations might accept a parameter, others not.
                                # Try with parameter, fallback to no-arg call.
                                invite.mark_accepted(accepted_by_user=user)
                            except TypeError:
                                # helper doesn't accept params — call without and set accepted_by below if needed
                                invite.mark_accepted()
                                # best-effort set accepted_by if model exposes the field
                                if hasattr(invite, "accepted_by") and invite.accepted_by is None:
                                    try:
                                        invite.accepted_by = user
                                        invite.save(update_fields=["accepted_by"])
                                    except Exception:
                                        logger.exception("failed to save accepted_by for invite %s after mark_accepted", invite.pk)
                        else:
                            # fallback: set fields individually
                            changed = False
                            if hasattr(invite, "accepted_by"):
                                try:
                                    invite.accepted_by = user
                                    changed = True
                                except Exception:
                                    logger.exception("failed to set accepted_by on invite %s", invite.pk)
                            if hasattr(invite, "accepted_at"):
                                try:
                                    from django.utils import timezone
                                    invite.accepted_at = timezone.now()
                                    changed = True
                                except Exception:
                                    logger.exception("failed to set accepted_at on invite %s", invite.pk)
                            if hasattr(invite, "accepted"):
                                try:
                                    invite.accepted = True
                                    changed = True
                                except Exception:
                                    logger.exception("failed to set accepted on invite %s", invite.pk)

                            if changed:
                                try:
                                    invite.save()
                                except Exception:
                                    logger.exception("failed to save invite %s after setting accepted fields", invite.pk)
                    except Exception:
                        logger.exception("mark_accepted/save failed for invite %s", invite.pk)

                # serialize fresh invite and member to return current state
                invite.refresh_from_db()
                invitation_data = InvitationSerializer(invite).data
                member_data = MemberSerializer(member_obj).data
                project_members_usernames = []
                if invite.project:
                    project_members_usernames = [m.user.username for m in invite.project.members.select_related("user").all()]

                return Response(
                    {
                        "detail": "invite accepted, user added to project",
                        "invitation": invitation_data,
                        "member": member_data,
                        "project_members": project_members_usernames,
                    },
                    status=status.HTTP_200_OK,
                )
            except Exception as exc:
                logger.exception("Failed to accept invite token=%s user=%s: %s", token, getattr(user, "username", None), exc)
                return Response({"detail": "server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Unauthenticated: return invite metadata so frontend can prompt login/register
        return Response(
            {
                "detail": "token valid",
                "email": getattr(invite, "email", None),
                "project": invite.project.id if invite.project else None,
                "project_name": invite.project.name if invite.project else None,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        token = request.query_params.get("token") or request.query_params.get("invite")
        if not token:
            return Response({"detail": "token required"}, status=status.HTTP_400_BAD_REQUEST)

        invite = self._get_invitation(token)
        if invite is None:
            return Response({"detail": "invalid token"}, status=status.HTTP_404_NOT_FOUND)

        try:
            if hasattr(invite, "is_valid") and callable(invite.is_valid):
                ok = invite.is_valid()
            else:
                ok = True
        except Exception:
            ok = True

        if not ok:
            return Response({"detail": "token expired or already used"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "detail": "token valid",
                "email": getattr(invite, "email", None),
                "project": invite.project.id if invite.project else None,
                "project_name": invite.project.name if invite.project else None,
            },
            status=status.HTTP_200_OK,
        )


class TeamListCreateView(generics.ListCreateAPIView):
    """
    GET /api/teams/ -> teams visible to the current user
    POST /api/teams/ -> create a team, accepts `name` and `member_ids` list
    """
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Team.objects.none()
        return Team.objects.filter(Q(created_by=user) | Q(members__user=user)).distinct()


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/teams/<pk>/
    PUT/PATCH /api/teams/<pk>/
    DELETE /api/teams/<pk>/
    """
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Team.objects.none()
        return Team.objects.filter(Q(created_by=user) | Q(members__user=user)).distinct()


# -----------------------
# New: Endpoint to persist the role/experience/skills from frontend
# -----------------------
class UserRoleUpdateView(APIView):
    """
    POST /api/user/role/
    Body example:
      { "role": "member", "experience": 3, "skills": "React, Django", "developer_type": "web" }

    Creates or updates the Member object for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    # keep your existing auth classes (if JWTAuthentication may be undefined in some environments,
    # keep the expression you were using earlier — adjust if necessary).
    authentication_classes = [TokenAuthentication, SessionAuthentication] + ([JWTAuthentication] if JWTAuthentication else [])

    def post(self, request):
        serializer = MemberUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = request.user

        try:
            with transaction.atomic():
                member_obj, _ = Member.objects.get_or_create(user=user)

                # role (required by serializer)
                member_obj.role = data.get("role", member_obj.role)

                # experience — update only if present in payload
                if "experience" in data:
                    member_obj.experience = data.get("experience")

                # skills — update only if present in payload
                if "skills" in data:
                    member_obj.skills = (data.get("skills") or "").strip()

                # developer_type — update only if present in payload
                if "developer_type" in data:
                    dev = data.get("developer_type")
                    # normalize empty string to None so DB stores NULL
                    if isinstance(dev, str):
                        dev = dev.strip() or None
                    member_obj.developer_type = dev

                member_obj.save()

            return Response(MemberSerializer(member_obj).data, status=status.HTTP_200_OK)

        except Exception as exc:
            logger.exception("Failed to update member for user=%s: %s", getattr(user, "pk", None), exc)
            return Response({"detail": "server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------
# New: whoami endpoint (returns user info + optional member_profile)
# -----------------------
class WhoAmIView(APIView):
    """
    GET /api/auth/whoami/
    Returns basic user info and member_profile if present.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication, SessionAuthentication] + ([JWTAuthentication] if JWTAuthentication else [])

    def get(self, request):
        user = request.user
        data = {
            "username": getattr(user, "username", None),
            "email": getattr(user, "email", None),
            "first_name": getattr(user, "first_name", None),
            "last_name": getattr(user, "last_name", None),
            "last_login": getattr(user, "last_login", None),
        }
        # include member_profile if one exists
        try:
            member_profile = getattr(user, "member_profile", None)
            if member_profile:
                data["member_profile"] = MemberSerializer(member_profile).data
        except Exception:
            # be defensive: if serialization fails, don't blow up the whole response
            logger.exception("Failed to serialize member_profile for user=%s", getattr(user, "pk", None))

        return Response(data, status=status.HTTP_200_OK)
