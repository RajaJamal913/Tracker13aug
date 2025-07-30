from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Sum
from projects.models import Member
from .serializers import TrackedHoursSerializer
from realtimemonitoring.models import WorkSession

class TrackedHoursReportView(APIView):
    """
    GET /api/reports/tracked-hours/
    Returns total tracked seconds per project for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1) Find the Member record
        try:
            member = Member.objects.get(user=request.user)
        except Member.DoesNotExist:
            return Response(
                {"detail": "Member record not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2) Aggregate total accumulated time per project
        qs = (
            WorkSession.objects
            .filter(member=member)
            .values('project_id', 'project__name')
            .annotate(total_seconds=Sum('accumulated'))
        )

        # 3) Serialize
        data = [
            {
                'project_id': item['project_id'],
                'project_name': item['project__name'],
                'total_seconds': item['total_seconds'] or 0,
            }
            for item in qs
        ]
        serializer = TrackedHoursSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
