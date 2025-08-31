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

from .models import Project, Member, Invitation
from .serializers import ProjectSerializer, MemberSerializer, InvitationSerializer

logger = logging.getLogger(__name__)
User = None
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None


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
        # keep original behavior but use serializer from get_serializer for context
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


@api_view(["GET"])
@permission_classes([AllowAny])
def get_members(request):
    """
    Return only Members that were added to projects via accepted invitations.
    This tries several common Invitation fields: accepted_at / accepted_on / is_accepted / accepted / accepted_by
    If none exist or no accepted invitations are found, returns an empty list.
    """
    # Build a queryset of accepted invitations using common field names.
    accepted_qs = Invitation.objects.none()
    try:
        # optimistic combined filter — will throw FieldError if a field doesn't exist
        accepted_qs = Invitation.objects.filter(
            Q(accepted_at__isnull=False) | Q(is_accepted=True) | Q(accepted_by__isnull=False)
        )
    except FieldError:
        # fallback to trying individual checks gracefully
        candidates = [
            ("accepted_at__isnull", False),
            ("accepted_on__isnull", False),
            ("accepted", True),
            ("is_accepted", True),
            ("accepted_by__isnull", False),
            ("accepted_by_id__isnull", False),
        ]
        for field, val in candidates:
            try:
                # Build filtering expression e.g. {'accepted_at__isnull': False}
                qs = Invitation.objects.filter(**{field: val})
                if qs.exists():
                    accepted_qs = qs
                    break
            except FieldError:
                continue

    # If still empty, try any invitation that links to a Member already assigned to the related project
    if not accepted_qs.exists():
        # Sometimes invites are marked by project.members relation only; find invitations whose email
        # matches a project member's user email (best-effort)
        try:
            invited_emails = Invitation.objects.values_list("email", flat=True)
            members_matching = Member.objects.filter(user__email__in=invited_emails).values_list("user__email", flat=True)
            if members_matching:
                accepted_qs = Invitation.objects.filter(email__in=list(members_matching))
        except Exception:
            accepted_qs = Invitation.objects.none()

    # Now collect emails and accepted_by ids from accepted invitations
    accepted_emails = list(accepted_qs.values_list("email", flat=True))
    accepted_user_ids = []
    try:
        accepted_user_ids = [x for x in accepted_qs.values_list("accepted_by_id", flat=True) if x]
    except Exception:
        accepted_user_ids = []

    member_filter = Q()
    if accepted_emails:
        member_filter |= Q(user__email__in=accepted_emails)
    if accepted_user_ids:
        member_filter |= Q(user__id__in=accepted_user_ids)

    if not member_filter.children:
        members = Member.objects.none()
    else:
        members = Member.objects.select_related("user").filter(member_filter).distinct()

    serializer = MemberSerializer(members, many=True)
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
    GET /api/invites/  -> list invites relevant to the current user (created_by or for projects they belong to)
    POST /api/invites/ -> create invite (created_by is set to request.user)
    """
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Invitation.objects.filter(
            Q(created_by=user) | Q(project__created_by=user) | Q(project__members__user=user)
        ).distinct().select_related("project", "created_by")

    def perform_create(self, serializer):
        invitation = serializer.save(created_by=self.request.user)
        # attempt to send email but don't fail creation if send fails
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

    def _get_invitation(self, token: str):
        try:
            return Invitation.objects.select_related("project").get(token=token)
        except Invitation.DoesNotExist:
            return None

    def post(self, request):
        token = (
            request.data.get("token")
            or request.data.get("invite")
            or request.query_params.get("token")
            or request.query_params.get("invite")
        )
        logger.info("AcceptInvitation called by user=%s token=%s",
                    getattr(request.user, "username", "ANON"), token)

        if not token:
            return Response({"detail": "token required"}, status=status.HTTP_400_BAD_REQUEST)

        invite = self._get_invitation(token)
        if invite is None:
            return Response({"detail": "invalid token"}, status=status.HTTP_404_NOT_FOUND)

        # check token validity via any helper your model provides, or check fields
        try:
            valid = True
            # If model provides is_valid method, prefer that
            if hasattr(invite, "is_valid") and callable(invite.is_valid):
                valid = invite.is_valid()
            else:
                # basic checks: not already accepted (try common accepted indicators)
                already_accepted = False
                for f in ("is_accepted", "accepted", "accepted_at", "accepted_on"):
                    if hasattr(invite, f):
                        val = getattr(invite, f)
                        if isinstance(val, bool) and val:
                            already_accepted = True
                        if val is not None and not (isinstance(val, bool) and val is False):
                            if f.endswith("_at") or f.endswith("_on"):
                                # datetime value present -> considered accepted
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
                    member_obj, created = Member.objects.get_or_create(user=user, defaults={"role": getattr(invite, "role", "")})
                    invite.project.members.add(member_obj)

                    # Try to mark invitation accepted reliably:
                    #  - set accepted_by if exists
                    #  - set accepted_at if exists
                    #  - set is_accepted flag if exists
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
                    if hasattr(invite, "is_accepted"):
                        try:
                            invite.is_accepted = True
                            changed = True
                        except Exception:
                            logger.exception("failed to set is_accepted on invite %s", invite.pk)

                    # If model exposes mark_accepted(), call it; otherwise save if we changed fields
                    try:
                        if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                            invite.mark_accepted()
                        elif changed:
                            invite.save()
                    except Exception:
                        logger.exception("mark_accepted/save failed for invite %s", invite.pk)

                # Prepare response payload
                invitation_data = InvitationSerializer(invite).data
                member_data = MemberSerializer(member_obj).data
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
