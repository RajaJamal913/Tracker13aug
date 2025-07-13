# tracker/views.py
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, F, Case, When, ExpressionWrapper, fields as ffields
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from realtimemonitoring.models import WorkSession
from .serializers import WorkSessionSerializer

class WorkSessionViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for WorkSession.
    """
    serializer_class = WorkSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # only sessions belonging to the logged‑in user
        return WorkSession.objects.filter(member__user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tracker_list(request):
    """
    GET /api/tracker/?type=hours|amount&range=day|week|month
    Returns aggregated total per member+project in the given time window.
    """
    ttype = request.query_params.get('type', 'hours')
    rng   = request.query_params.get('range', 'day')
    now   = timezone.now()

    # build start-of-window
    if rng == 'week':
        since = now - timedelta(weeks=1)
    elif rng == 'month':
        since = now - timedelta(days=30)
    else:  # day
        since = now - timedelta(days=1)

    # filter sessions that began >= since
    qs = WorkSession.objects.filter(start__gte=since)

    # Annotate sum of accumulated seconds
    agg = qs.values(
        'member__user__username',
        'member__user__email',
        'project__name',
    ).annotate(
        total_accum=Sum('accumulated'),
        # count how many are currently running
        running_count=Sum(
            Case(
                When(is_running=True, then=1),
                default=0,
                output_field=ffields.IntegerField()
            )
        )
    )

    out = []
    for row in agg:
        # add live seconds for any running sessions
        live = WorkSession.objects.filter(
            member__user__username=row['member__user__username'],
            project__name=row['project__name'],
            is_running=True
        ).aggregate(
            live=Sum(
                ExpressionWrapper(
                    (now - F('start')),
                    output_field=ffields.DurationField()
                )
            )
        )['live'] or 0

        live_secs = int(live.total_seconds()) if hasattr(live, 'total_seconds') else int(live)
        total_secs = (row['total_accum'] or 0) + live_secs

        if ttype == 'amount':
            # if you track billing rates elsewhere, multiply here
            total = f"${(row['total_accum'] or 0) * 0.0:.2f}"
        else:
            h = total_secs // 3600
            m = (total_secs % 3600) // 60
            total = f"{h}h {m}m"

        out.append({
            'member':  row['member__user__username'],
            'email':   row['member__user__email'],
            'project': row['project__name'],
            'total':   total,
        })

    return Response(out, status=status.HTTP_200_OK)
