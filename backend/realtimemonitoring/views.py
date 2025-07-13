# realtimemonitoring/views.py
from django.utils import timezone

from rest_framework import permissions, status,generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import  BreakPolicy, BreakSession, WorkSession
from .serializers import  WorkSessionStatusSerializer,BreakPolicySerializer,BreakSessionStatusSerializer
from projects.models import Member


class MonitorStatusView(APIView):
    """
    GET /api/monitor/status/
    Returns the authenticated user’s current WorkSession (creating one if needed).
    """
    permission_classes = [permissions.IsAuthenticated]
    # Because we want to make sure only logged‑in users hit this.

    def get(self, request):
        # 1) Find the Member record for this User.
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2) get_or_create the WorkSession for that Member.
        session, _ = WorkSession.objects.get_or_create(member=member)
        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStartView(APIView):
    """
    POST /api/monitor/start/
    (Re)starts the authenticated user’s WorkSession.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        session, _ = WorkSession.objects.get_or_create(member=member)
        session.restart()
        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)


class MonitorStopView(APIView):
    """
    POST /api/monitor/stop/
    Pauses the authenticated user’s WorkSession.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            member = Member.objects.get(user__username=request.user.username)
        except Member.DoesNotExist:
            return Response(
                {"detail": "No Member record found for user."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            session = WorkSession.objects.get(member=member)
        except WorkSession.DoesNotExist:
            return Response(
                {"detail": "No active session to stop."},
                status=status.HTTP_404_NOT_FOUND
            )

        session.stop()
        data = WorkSessionStatusSerializer(session).data
        return Response(data, status=status.HTTP_200_OK)
    
class MembersStatusView(APIView):
    """
    GET /api/monitor/members-status/
    Returns a list of ALL members’ current WorkSession status (ID, name, active/paused, total_seconds).
    """
    def get(self, request):
        # 1) Grab all WorkSession rows, selecting related Member→User in one SQL query.
        #    (Assumes WorkSession has foreign key `member = models.ForeignKey(Member, ...)`.)
        sessions = WorkSession.objects.select_related("member", "member__user").all()

        data = []
        for sess in sessions:
            # sess.member is a Member instance. To get a username (or full name), we must go through sess.member.user
            user_obj = sess.member.user

            # Build the response dictionary for this member:
            data.append({
                "id": user_obj.id,
                "name": user_obj.get_full_name() or user_obj.username,
                "status": "active" if sess.is_running else "paused",
                "total_seconds": sess.total_seconds,
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
