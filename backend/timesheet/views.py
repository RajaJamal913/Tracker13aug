# timesheet/views.py
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from .models import TimeRequest, Notification
from .serializers import TimeRequestSerializer, NotificationSerializer

class TimeRequestViewSet(viewsets.ModelViewSet):
    """
    - Regular users may CREATE & LIST only their own requests.
    - Project owners (staff or owner) may PATCH status to APPROVED/REJECTED.
    """
    queryset = TimeRequest.objects.all()
    serializer_class = TimeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["status", "project__name", "task__title"]
    ordering_fields = ["created_at", "date"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_staff:
            return qs
        # use Q directly
        return qs.filter(
            Q(user=user) |
            Q(project__created_by=user)
        )

    def create(self, request, *args, **kwargs):
        # on create, serializer.create will attach .user
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Only allow patching `status` to APPROVED/REJECTED by the project owner.
        When status changes, mark related Notification as read.
        """
        instance = self.get_object()
        user = request.user

        # only the project owner (or staff) may change status
        if instance.project.created_by != user and not user.is_staff:
            return Response({"detail":"Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        old_status = instance.status
        new_status = serializer.validated_data.get("status", old_status)
        self.perform_update(serializer)

        # if status really changed, mark the original notification read
        if new_status != old_status:
            Notification.objects.filter(time_request=instance).update(is_read=True)

        return Response(serializer.data)

class NotificationViewSet(viewsets.ModelViewSet):
    """
    Users can list and mark their notifications as read.
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
