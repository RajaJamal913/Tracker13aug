import logging
from django.db import transaction
from django.db.models import Q, Count
from django.core.exceptions import FieldError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .utils import accept_invite_for_user

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


# Helper used only for explicit invite acceptance (POST by an authenticated user)
def _accept_invite_and_create_member(invite: Invitation, user):
    """
    Idempotent: attach/create Member, attach to project, ensure invite fields are set and saved.
    Call this only when the user explicitly accepts (POST while authenticated).
    """
    try:
        with transaction.atomic():
            member_obj, _ = Member.objects.get_or_create(user=user, defaults={"role": getattr(invite, "role", "")})

            # Attach to project if present (defensive)
            if getattr(invite, "project", None):
                try:
                    invite.project.members.add(member_obj)
                except Exception:
                    logger.exception("Failed to add member to project for invite %s user %s", getattr(invite, "pk", None), getattr(user, "pk", None))

            # Prefer calling model helper if present, but still ensure DB fields are set & saved
            try:
                if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                    # try a few common signatures; be defensive about TypeError
                    try:
                        invite.mark_accepted(accepted_by_user=user)
                    except TypeError:
                        try:
                            invite.mark_accepted(accepted_by=user)
                        except TypeError:
                            try:
                                invite.mark_accepted()
                            except Exception:
                                logger.exception("mark_accepted() raised for invite %s", getattr(invite, "pk", None))
            except Exception:
                logger.exception("mark_accepted() raised for invite %s", getattr(invite, "pk", None))

            # Make sure DB fields reflect acceptance (in case helper didn't set or save)
            changed = False
            if hasattr(invite, "accepted_by") and (getattr(invite, "accepted_by") is None):
                try:
                    invite.accepted_by = user
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_by on invite %s", getattr(invite, "pk", None))

            if hasattr(invite, "accepted_at") and (getattr(invite, "accepted_at") is None):
                try:
                    invite.accepted_at = timezone.now()
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_at on invite %s", getattr(invite, "pk", None))

            for fld in ("accepted", "is_accepted"):
                if hasattr(invite, fld) and not getattr(invite, fld):
                    try:
                        setattr(invite, fld, True)
                        changed = True
                    except Exception:
                        logger.exception("Failed to set %s on invite %s", fld, getattr(invite, "pk", None))

            if changed:
                try:
                    invite.save()
                except Exception:
                    logger.exception("Failed to save invite %s after setting accepted fields", getattr(invite, "pk", None))

            logger.info("Invite id=%s explicitly accepted by user=%s", getattr(invite, "pk", None), getattr(user, "pk", None))
            return member_obj
    except Exception:
        logger.exception("Error accepting invite id=%s for user=%s", getattr(invite, "pk", None), getattr(user, "pk", None))
        raise


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

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# make sure imports match your project layout
from .models import Invitation, Member
from .serializers import MemberSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_members_who_invited_me(request):
    """
    GET /api/members/who-invited-me/
    Returns the Member records (serialised) for users who invited the current user,
    and minimal user info for inviters who don't have a Member record yet.
    """
    user = request.user
    user_email = getattr(user, "email", None)
    if not user_email:
        return Response({"members": [], "users_without_member": []}, status=status.HTTP_200_OK)

    try:
        # Invitations where email matches the user's email OR invite was accepted by this user
        invites_qs = Invitation.objects.filter(
            Q(email__iexact=user_email) | Q(accepted_by=user)
        ).exclude(created_by__isnull=True).distinct().select_related("created_by")

        inviter_ids = [cid for cid in invites_qs.values_list("created_by_id", flat=True) if cid and cid != getattr(user, "id", None)]
        inviter_ids = list(dict.fromkeys(inviter_ids))  # preserve uniqueness

        if not inviter_ids:
            return Response({"members": [], "users_without_member": []}, status=status.HTTP_200_OK)

        # Get Member objects for those inviter users
        members_qs = Member.objects.filter(user__id__in=inviter_ids).select_related("user").distinct()
        members_data = MemberSerializer(members_qs, many=True).data

        # Determine inviter users that do not have Member records
        member_user_ids = set(members_qs.values_list("user_id", flat=True))
        missing_user_ids = [uid for uid in inviter_ids if uid not in member_user_ids]

        users_without_member = []
        if missing_user_ids:
            users_qs = User.objects.filter(id__in=missing_user_ids)
            # Return only minimal safe fields
            users_without_member = [
                {
                    "id": u.id,
                    "username": getattr(u, "username", None),
                    "email": getattr(u, "email", None),
                    "first_name": getattr(u, "first_name", None),
                    "last_name": getattr(u, "last_name", None),
                }
                for u in users_qs
            ]

        return Response({"members": members_data, "users_without_member": users_without_member}, status=status.HTTP_200_OK)

    except Exception as exc:
        # defensive logging is recommended (logger.exception)
        return Response({"detail": "server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    GET  /api/invites/ -> list invites relevant to the current user
    POST /api/invites/ -> create invite (created_by is set to request.user)

    NOTE: Auto-accept-by-existing-email behavior has been removed here. Invites
    will be accepted only when the invite token is explicitly used by the
    recipient (e.g. AcceptInvitationView POST when authenticated, or via a
    registration/login flow that calls accept_invite_for_user).
    """
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        user = self.request.user
        if not user or getattr(user, "is_anonymous", True):
            return Invitation.objects.none()

        return Invitation.objects.filter(
            Q(created_by=user) | Q(project__created_by=user) | Q(project__members__user=user)
        ).distinct().select_related("project", "created_by")

    def _mark_invite_accepted_for_user(self, invitation, user):
        """
        Internal wrapper that delegates to the centralized helper accept_invite_for_user.
        Returns Member instance or None.
        Note: callers must ensure they have validated the token / authorisation.
        """
        try:
            return accept_invite_for_user(invitation, user)
        except Exception:
            logger.exception(
                "_mark_invite_accepted_for_user failed for invite %s user %s",
                getattr(invitation, "pk", None),
                getattr(user, "pk", None),
            )
            return None

    def perform_create(self, serializer):
        """
        Create invitation (and optionally a project) then save the invitation.

        Removed behavior: do NOT automatically accept invites when a user with
        the same email exists. Acceptance must happen when the token is used.
        """
        request = self.request
        data = getattr(request, "data", {}) or {}
        create_project_flag = data.get("create_project") or data.get("createProject") or False
        project_name = data.get("project_name") or data.get("projectName") or None

        try:
            with transaction.atomic():
                project = None

                # 1) Create project if requested
                if create_project_flag:
                    if not project_name or str(project_name).strip() == "":
                        raise ValueError("project_name is required when create_project is true")

                    project = Project.objects.create(
                        name=str(project_name).strip(),
                        created_by=request.user
                    )
                    # Ensure the requesting user is a member
                    assign_user_to_project(project, request.user)
                    # Persist invitation attached to project
                    invitation = serializer.save(created_by=request.user, project=project)
                else:
                    # Standard behaviour: save invite without creating a project
                    invitation = serializer.save(created_by=request.user)

                # 2) Attempt to send email (best-effort)
                try:
                    from .utils import send_invite_email_plain
                    send_invite_email_plain(invitation)
                except Exception:
                    logger.exception("Failed to send invite email for invitation id=%s", getattr(invitation, "pk", None))

                # NOTE: intentionally not auto-accepting invites for existing emails.
                # Recipients must explicitly use the invite token/link to accept it.

        except Exception:
            logger.exception(
                "Failed to create invitation (perform_create) for request user=%s",
                getattr(request.user, "pk", None)
            )
            raise

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

        # Authenticated acceptance — explicit only when user POSTs while authenticated
        if request.user and request.user.is_authenticated:
            user = request.user
            try:
                with transaction.atomic():
                    # Delegate to the centralized accept_invite_for_user helper
                    member_obj = accept_invite_for_user(invite, user)

                # serialize fresh invite and member to return current state
                invite.refresh_from_db()
                invitation_data = InvitationSerializer(invite).data
                member_data = MemberSerializer(member_obj).data if member_obj is not None else None
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
