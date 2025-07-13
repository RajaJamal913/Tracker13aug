# shifts/views.py

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Shift
from .serializers import ShiftSerializer

class ShiftListCreateAPIView(generics.ListCreateAPIView):
    """
    GET  /api/shifts/    → list all shifts created by this user
    POST /api/shifts/    → create a new shift (authenticated users only)
    """
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Shift.objects.filter(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Explicitly log serializer errors to console
            print("Shift creation validation errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(created_by=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ShiftRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    """
    GET /api/shifts/<int:pk>/   → retrieve a single shift
    PUT /api/shifts/<int:pk>/   → update a shift (only if created_by == request.user)
    """
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_object_permissions(self, request, obj):
        if obj.created_by != request.user:
            raise PermissionDenied("You do not have permission to modify this shift.")
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
# shifts/views.py
# shifts/views.py
# shifts/views.py

from datetime import datetime
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from realtimemonitoring.models import WorkSession
from .models import Shift
from .serializers import TrackedShiftSerializer

class TrackedShiftsView(APIView):
    """
    GET /api/shifts/tracked/?date=YYYY-MM-DD
    """
    # permission_classes = [IsAuthenticated]  # enable if you need authentication

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"detail": "date parameter required"},
                            status=status.HTTP_400_BAD_REQUEST)

        # parse date
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return Response({"detail": "invalid date format"},
                            status=status.HTTP_400_BAD_REQUEST)

        weekday = target_date.strftime("%a")  # e.g. 'Mon'

        shifts = Shift.objects.filter(working_days__icontains=weekday)

        now = timezone.now()
        output = []

        for shift in shifts:
            # get all members of this shift
            members = shift.members.all()
            member_usernames = list(
                members.values_list("user__username", flat=True)
            )

            # filter sessions for that date + those members
            qs = WorkSession.objects.filter(
                start__date=target_date,
                member__in=members
            )

            # restrict to shift time window on the session start time
            if shift.start_time < shift.end_time:
                qs = qs.filter(
                    start__time__gte=shift.start_time,
                    start__time__lt= shift.end_time
                )
            else:
                # overnight shift
                qs = qs.filter(
                    Q(start__time__gte=shift.start_time) |
                    Q(start__time__lt= shift.end_time)
                )

            # now sum durations in Python
            total_secs = 0
            for sess in qs:
                # accumulated is stored in seconds
                secs = sess.accumulated or 0
                if sess.is_running:
                    delta = now - sess.start
                    secs += int(delta.total_seconds())
                total_secs += secs

            hours = total_secs // 3600
            mins  = (total_secs % 3600) // 60
            tracked_hours = f"{hours}h {mins}m"

            output.append({
                "id": shift.id,
                "name": shift.name,
                "start_time": shift.start_time,
                "end_time": shift.end_time,
                "member_usernames": member_usernames,
                "tracked_hours": tracked_hours,
            })

        serializer = TrackedShiftSerializer(output, many=True)
        return Response(serializer.data)

