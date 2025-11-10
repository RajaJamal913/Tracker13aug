# realtimemonitoring/views.py
from django.utils import timezone
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import BreakPolicy, BreakSession, WorkSession
from .serializers import (
    WorkSessionStatusSerializer,
    BreakPolicySerializer,
    BreakSessionStatusSerializer,
)
from projects.models import Member, Project
from django.shortcuts import get_object_or_404
from datetime import date


class MonitorStatusView(APIView):
    """
    GET /api/monitor/status/?project=<id>
    Returns the user's current WorkSession for a given project (creating one if needed).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        # get_or_create without invalid defaults
        session, created = WorkSession.objects.get_or_create(
            member=member,
            project=project,
        )
        if created:
            # initialize the newly created session
            session.restart()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStartView(APIView):
    """
    POST /api/monitor/start/?project=<id>
    Starts or restarts a WorkSession for the given project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get('project') or request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        # get_or_create, then restart
        session, _ = WorkSession.objects.get_or_create(
            member=member,
            project=project,
        )
        session.restart()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStopView(APIView):
    """
    POST /api/monitor/stop/?project=<id>
    Stops (pauses) the WorkSession for the given project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get('project') or request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        session = get_object_or_404(WorkSession, member=member, project=project)
        session.stop()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MembersStatusView(APIView):
    """
    GET /api/monitor/members-status/?project=<id>
    Returns all members' WorkSession status for a project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        if project_id:
            sessions = WorkSession.objects.filter(project_id=project_id)
        else:
            sessions = WorkSession.objects.all()

        sessions = sessions.select_related('member', 'member__user', 'project')
        data = []
        for sess in sessions:
            user = sess.member.user
            data.append({
                'id': user.id,
                'name': user.get_full_name() or user.username,
                'status': 'active' if sess.is_running else 'paused',
                'total_seconds': sess.total_seconds,
                'project_id': sess.project_id,
                'project_name': sess.project.name,
            })
        return Response(data, status=status.HTTP_200_OK)

# ─── 1) List + Create BreakPolicy ─────────────────────────────────────────
# ─── 1) List + Create BreakPolicy ─────────────────────────────────────────

class BreakPolicyListCreateView(generics.ListCreateAPIView):
    """
    GET /api/break/policies/       → list all break policies
    POST /api/break/policies/      → create a new break policy
    """
    permission_classes = [permissions.IsAuthenticated]  # or IsAdminUser if needed
    queryset = BreakPolicy.objects.all().order_by("name")
    serializer_class = BreakPolicySerializer

    def perform_create(self, serializer):
        policy = serializer.save()
        # If apply_to_new=True, you could hook into a signal that auto-adds any new Member.
        return policy


# ─── 2) Retrieve, Update, Delete one BreakPolicy ─────────────────────────

class BreakPolicyRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/break/policies/{id}/     → retrieve a single policy
    PUT    /api/break/policies/{id}/     → update
    PATCH  /api/break/policies/{id}/     → partial update
    DELETE /api/break/policies/{id}/     → delete
    """
    permission_classes = [permissions.IsAuthenticated]  # or IsAdminUser
    queryset = BreakPolicy.objects.all()
    serializer_class = BreakPolicySerializer


# ─── 3) Get or Create Current BreakSession Status ─────────────────────────

class BreakStatusView(APIView):
    """
    GET /api/break/status/
    Returns the authenticated user’s current BreakSession,
    creating one if needed (in paused state).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1) Find the Member record for this user
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2) get_or_create a BreakSession for that Member (default: paused, no policy attached)
        session, created = BreakSession.objects.get_or_create(member=member)
        # If it was just created, ensure it’s paused by default:
        if created:
            session.is_running = False
            session.accumulated = 0
            session.policy = None
            session.save()

        data = BreakSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


# ─── 4) Start Break (Take Break) ───────────────────────────────────────────

class BreakStartView(APIView):
    """
    POST /api/break/start/
    Body: { "policy_id": <int> }
    → “Take Break”: stops the WorkSession if running, then (re)starts the BreakSession with the chosen policy.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1) Validate payload
        policy_id = request.data.get("policy_id", None)
        if policy_id is None:
            return Response(
                {"detail": "policy_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2) Find Member
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3) Ensure BreakPolicy exists & applies to this member
        try:
            policy = BreakPolicy.objects.get(id=policy_id)
        except BreakPolicy.DoesNotExist:
            return Response(
                {"detail": "Specified BreakPolicy does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        # (Optional) If you only want to allow policies that explicitly include this member:
        if not policy.members.filter(id=member.id).exists() and not policy.apply_to_new:
            return Response(
                {"detail": "You are not allowed to take this break (policy mismatch)."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 4) Stop the WorkSession (if it exists and is running)
        try:
            work_session = WorkSession.objects.get(member=member)
            if work_session.is_running:
                work_session.stop()
        except WorkSession.DoesNotExist:
            # No active or existing WorkSession → we can ignore
            pass

        # 5) get_or_create the BreakSession, set policy, and restart
        break_session, _ = BreakSession.objects.get_or_create(member=member)
        break_session.policy = policy
        break_session.restart()

        # 6) Return the serialized BreakSession status
        data = BreakSessionStatusSerializer(break_session).data
        return Response(data, status=status.HTTP_200_OK)


# ─── 5) Stop Break → “Resume WorkSession” ───────────────────────────────────

class BreakStopView(APIView):
    """
    POST /api/break/stop/
    → “Stop Break”: stop the BreakSession, then restart (or create) the WorkSession.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1) Find Member
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2) Get the existing BreakSession
        try:
            break_session = BreakSession.objects.get(member=member)
        except BreakSession.DoesNotExist:
            return Response(
                {"detail": "No active BreakSession to stop."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3) Stop it (accumulate)
        if break_session.is_running:
            break_session.stop()

        # 4) Then restart (or create) the WorkSession
        session, _ = WorkSession.objects.get_or_create(member=member)
        session.restart()

        # 5) Return both statuses:
        #    a) For convenience, include new WorkSession status
        work_data = WorkSessionStatusSerializer(session).data
        #    b) And also send updated BreakSession status
        break_data = BreakSessionStatusSerializer(break_session).data

        return Response(
            {
                "work_session": work_data,
                "break_session": break_data,
            },
            status=status.HTTP_200_OK
        )
# realtimemonitoring/views.py
from django.utils import timezone
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from datetime import date

from .models import BreakPolicy, BreakSession, WorkSession
from .serializers import (
    WorkSessionStatusSerializer,
    BreakPolicySerializer,
    BreakSessionStatusSerializer,
)
from projects.models import Member, Project


# ─── 1) Work Monitoring Views ──────────────────────────────────────────────

class MonitorStatusView(APIView):
    """
    GET /api/monitor/status/?project=<id>
    Returns the user's current WorkSession for a given project (creating one if needed).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        # Safely get or create the work session
        session, created = WorkSession.objects.get_or_create(
            member=member,
            project=project,
        )
        if created:
            session.is_running = False
            session.save()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStartView(APIView):
    """
    POST /api/monitor/start/?project=<id>
    Starts or restarts a WorkSession for the given project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get('project') or request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        session, _ = WorkSession.objects.get_or_create(member=member, project=project)
        session.restart()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStopView(APIView):
    """
    POST /api/monitor/stop/?project=<id>
    Stops (pauses) the WorkSession for the given project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get('project') or request.query_params.get('project')
        project = get_object_or_404(Project, pk=project_id)
        member = get_object_or_404(Member, user=request.user)

        session = WorkSession.objects.filter(member=member, project=project).order_by('-start').first()
        if not session:
            return Response({"detail": "No active work session found."}, status=status.HTTP_404_NOT_FOUND)

        if session.is_running:
            session.stop()

        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MembersStatusView(APIView):
    """
    GET /api/monitor/members-status/?project=<id>
    Returns all members' WorkSession status for a project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        if project_id:
            sessions = WorkSession.objects.filter(project_id=project_id)
        else:
            sessions = WorkSession.objects.all()

        sessions = sessions.select_related('member', 'member__user', 'project')
        data = []
        for sess in sessions:
            user = sess.member.user
            data.append({
                'id': user.id,
                'name': user.get_full_name() or user.username,
                'status': 'active' if sess.is_running else 'paused',
                'total_seconds': sess.total_seconds,
                'project_id': sess.project_id,
                'project_name': sess.project.name,
            })
        return Response(data, status=status.HTTP_200_OK)


# ─── 2) Break Policy Views ─────────────────────────────────────────────────

class BreakPolicyListCreateView(generics.ListCreateAPIView):
    """
    GET /api/monitor/break/policies/       → list all break policies
    POST /api/monitor/break/policies/      → create a new break policy
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = BreakPolicy.objects.all().order_by("name")
    serializer_class = BreakPolicySerializer

    def perform_create(self, serializer):
        policy = serializer.save()
        return policy


class BreakPolicyRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/monitor/break/policies/{id}/     → retrieve a single policy
    PUT    /api/monitor/break/policies/{id}/     → update
    PATCH  /api/monitor/break/policies/{id}/     → partial update
    DELETE /api/monitor/break/policies/{id}/     → delete
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = BreakPolicy.objects.all()
    serializer_class = BreakPolicySerializer


# ─── 3) Break Session Views ────────────────────────────────────────────────

class BreakStatusView(APIView):
    """
    GET /api/monitor/break/status/?project=<id>
    Returns the authenticated user's current BreakSession.
    Creates one if needed (paused, no policy).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member = get_object_or_404(Member, user=request.user)

        session, created = BreakSession.objects.get_or_create(member=member)
        if created:
            session.is_running = False
            session.accumulated = 0
            session.policy = None
            session.save()

        data = BreakSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class BreakStartView(APIView):
    """
    POST /api/monitor/break/start/
    Body: { "policy_id": <int>, "project": <int> }

    → Take Break: stops the WorkSession for that project, then starts a BreakSession with chosen policy.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        policy_id = request.data.get("policy_id")
        project_id = request.data.get("project") or request.query_params.get("project")

        if not policy_id:
            return Response({"detail": "policy_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not project_id:
            return Response({"detail": "project is required."}, status=status.HTTP_400_BAD_REQUEST)

        member = get_object_or_404(Member, user=request.user)
        project = get_object_or_404(Project, pk=project_id)
        policy = get_object_or_404(BreakPolicy, id=policy_id)

        # Optional: restrict who can take which policy
        if not policy.members.filter(id=member.id).exists() and not policy.apply_to_new:
            return Response({"detail": "You are not allowed to take this break (policy mismatch)."},
                            status=status.HTTP_403_FORBIDDEN)

        # Safely stop only the relevant WorkSession
        work_session = WorkSession.objects.filter(member=member, project=project).order_by('-start').first()
        if work_session and work_session.is_running:
            work_session.stop()

        # Start or resume BreakSession
        break_session, _ = BreakSession.objects.get_or_create(member=member)
        break_session.policy = policy
        break_session.restart()

        return Response(BreakSessionStatusSerializer(break_session).data, status=status.HTTP_200_OK)


class BreakStopView(APIView):
    """
    POST /api/monitor/break/stop/
    Body: { "project": <int> }

    → Stop Break: stops the BreakSession, then restarts (or creates) WorkSession for that project.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get("project") or request.query_params.get("project")
        if not project_id:
            return Response({"detail": "project is required."}, status=status.HTTP_400_BAD_REQUEST)

        member = get_object_or_404(Member, user=request.user)
        project = get_object_or_404(Project, pk=project_id)

        break_session = BreakSession.objects.filter(member=member).first()
        if not break_session:
            return Response({"detail": "No active BreakSession found."}, status=status.HTTP_404_NOT_FOUND)

        if break_session.is_running:
            break_session.stop()

        # Resume work for this project
        session, _ = WorkSession.objects.get_or_create(member=member, project=project)
        session.restart()

        return Response({
            "work_session": WorkSessionStatusSerializer(session).data,
            "break_session": BreakSessionStatusSerializer(break_session).data
        }, status=status.HTTP_200_OK)
