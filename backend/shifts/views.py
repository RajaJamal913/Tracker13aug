# shifts/views.py

from datetime import datetime

from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shift, ShiftNotification, Attendance
from .serializers import (
    ShiftSerializer,
    ShiftNotificationSerializer,
    TrackedShiftSerializer,
    AttendanceSerializer,
)
from projects.models import Member
from realtimemonitoring.models import WorkSession
from .utils import create_or_update_attendance_for


class ShiftListCreateAPIView(generics.ListCreateAPIView):
    """
    GET  /api/shifts/    → list shifts created by this user
    POST /api/shifts/    → create a new shift (authenticated users only)
    """
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return shifts created by this user; include related fields for efficient serialization
        return (
            Shift.objects.filter(created_by=self.request.user)
            .select_related("created_by")
            .prefetch_related("members__user")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Explicitly log serializer errors to console (keeps your previous behavior)
            print("Shift creation validation errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # pass created_by explicitly (serializer.create also uses context['request'] when available)
        serializer.save(created_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ShiftRetrieveUpdateAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/shifts/<int:pk>/      -> retrieve a single shift
    PUT /api/shifts/<int:pk>/      -> update a shift (only if created_by == request.user)
    PATCH /api/shifts/<int:pk>/    -> partial update (only if created_by == request.user)
    DELETE /api/shifts/<int:pk>/   -> delete a shift (only if created_by == request.user)
    """
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Use a queryset that selects related fields to avoid extra DB hits during serialization
        return Shift.objects.all().select_related("created_by").prefetch_related("members__user")

    def check_object_permissions(self, request, obj):
        # Allow anyone to GET a shift, but restrict modifying/deleting to the creator only.
        if request.method in ("PUT", "PATCH", "DELETE"):
            if obj.created_by != request.user:
                raise PermissionDenied("You do not have permission to modify or delete this shift.")
        return super().check_object_permissions(request, obj)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            print(f"Shift update validation errors (id={instance.id}):", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Delete the shift. `check_object_permissions` runs before this, so creator-check is enforced.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TrackedShiftsView(APIView):
    """
    GET /api/shifts/tracked/?date=YYYY-MM-DD
    Returns lightweight tracked-hours for shifts whose working_days include the weekday.
    """
    # permission_classes = [IsAuthenticated]  # enable if you need authentication

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"detail": "date parameter required"}, status=status.HTTP_400_BAD_REQUEST)

        # parse date
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return Response({"detail": "invalid date format"}, status=status.HTTP_400_BAD_REQUEST)

        weekday = target_date.strftime("%a")  # e.g. 'Mon'

        # include related data to reduce queries when collecting members
        shifts = (
            Shift.objects.filter(working_days__icontains=weekday)
            .select_related("created_by")
            .prefetch_related("members__user")
        )

        now = timezone.now()
        output = []

        for shift in shifts:
            # get all members of this shift
            members = shift.members.all()
            member_usernames = list(members.values_list("user__username", flat=True))

            # filter sessions for that date + those members
            qs = WorkSession.objects.filter(start__date=target_date, member__in=members)

            # restrict to shift time window on the session start time
            if shift.start_time < shift.end_time:
                qs = qs.filter(start__time__gte=shift.start_time, start__time__lt=shift.end_time)
            else:
                # overnight shift
                qs = qs.filter(Q(start__time__gte=shift.start_time) | Q(start__time__lt=shift.end_time))

            # now sum durations in Python
            total_secs = 0
            for sess in qs:
                secs = sess.accumulated or 0
                if sess.is_running:
                    delta = now - sess.start
                    secs += int(delta.total_seconds())
                total_secs += secs

            hours = total_secs // 3600
            mins = (total_secs % 3600) // 60
            tracked_hours = f"{hours}h {mins}m"

            output.append(
                {
                    "id": shift.id,
                    "name": shift.name,
                    "start_time": shift.start_time,
                    "end_time": shift.end_time,
                    "member_usernames": member_usernames,
                    "tracked_hours": tracked_hours,
                }
            )

        serializer = TrackedShiftSerializer(output, many=True)
        return Response(serializer.data)


class AssignedShiftsListAPIView(generics.ListAPIView):
    """
    GET /api/shifts/assigned/ -> shifts where the request.user is a Member
    """
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            member = Member.objects.get(user=self.request.user)
        except Member.DoesNotExist:
            raise NotFound("No Member record found for current user.")

        # ensure created_by and members__user are prefetched for efficient serialization
        return (
            Shift.objects.filter(members=member)
            .select_related("created_by")
            .prefetch_related("members__user")
            .order_by("-start_date")
        )


class MyShiftNotificationsAPIView(generics.ListAPIView):
    """
    GET /api/shifts/notifications/ -> fetch notifications for current user's Member record
    """
    serializer_class = ShiftNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            member = Member.objects.get(user=self.request.user)
        except Member.DoesNotExist:
            raise NotFound("No Member record found for current user.")
        # select_related('shift') might help if you include shift fields in the notification serializer
        return ShiftNotification.objects.filter(recipient=member).select_related("shift")


class AttendanceCheckInAPIView(APIView):
    """
    POST /api/attendance/checkin/
    Body (optional): {"detected_at": "2025-12-20T08:12:00Z"} (ISO)
    Creates/updates attendance records for the current user's Member record for matching shifts.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            member = Member.objects.get(user=request.user)
        except Member.DoesNotExist:
            return Response({"detail": "Member record not found"}, status=status.HTTP_404_NOT_FOUND)

        detected_at = request.data.get("detected_at", None)
        if detected_at:
            try:
                from django.utils.dateparse import parse_datetime

                dt = parse_datetime(detected_at)
                if dt is None:
                    raise ValueError("bad datetime")
                # ensure timezone aware
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone=timezone.utc)
                detected_dt = dt
            except Exception:
                detected_dt = timezone.now()
        else:
            detected_dt = timezone.now()

        # tracked_seconds optional
        tracked_seconds = request.data.get("tracked_seconds", None)
        if tracked_seconds is not None:
            try:
                tracked_seconds = int(tracked_seconds)
            except Exception:
                tracked_seconds = None

        att_list, warnings = create_or_update_attendance_for(
            member, detected_dt=detected_dt, tracked_seconds=tracked_seconds
        )
        serializer = AttendanceSerializer(att_list, many=True)
        return Response({"attendances": serializer.data, "warnings": warnings})


class AttendanceListAPIView(generics.ListAPIView):
    """
    GET /api/attendance/?date=YYYY-MM-DD  -> list attendance records for current user
    If no date is provided, defaults to today (server date).
    """
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            member = Member.objects.get(user=self.request.user)
        except Member.DoesNotExist:
            return Attendance.objects.none()

        date_str = self.request.query_params.get("date", None)
        if date_str:
            from django.utils.dateparse import parse_date

            d = parse_date(date_str)
        else:
            # use today's date in server timezone; optionally convert to member timezone if needed
            d = timezone.localdate()
        return Attendance.objects.filter(member=member, date=d).order_by("-created_at")
