# timesheet/views.py
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from .models import TimeRequest, Notification
from .serializers import TimeRequestSerializer, NotificationSerializer
from rest_framework.authentication import TokenAuthentication
# timesheet/views.py
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from .models import TimeRequest, Notification
from .serializers import TimeRequestSerializer, NotificationSerializer
from rest_framework.authentication import TokenAuthentication


class TimeRequestViewSet(viewsets.ModelViewSet):
    """
    - Regular users may CREATE & LIST only their own requests.
    - Request creators may edit/delete their own requests (but not change status).
    - Project owners (or staff) may PATCH status to APPROVED/REJECTED.
    """
    queryset = TimeRequest.objects.all()
    serializer_class = TimeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["status", "project__name", "task__title"]
    ordering_fields = ["created_at", "date"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_staff:
            return qs
        return qs.filter(
            Q(user=user) |
            Q(project__created_by=user)
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # ensure request is available to serializer (DRF does this by default, but just in case)
        ctx["request"] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        # on create, serializer.create will attach .user
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Permission rules for PATCH:
         - If changing `status`: only project owner (project.created_by) or staff can do it.
         - If changing other fields: only the request creator (obj.user) or staff may do it.
        When status really changes, mark related Notification read.
        """
        instance = self.get_object()
        user = request.user

        incoming_status = None
        if isinstance(request.data, dict):
            incoming_status = request.data.get("status", None)
        else:
            # request.data may be QueryDict or other; access via get
            incoming_status = request.data.get("status", None)

        # Changing status -> only project owner or staff
        if incoming_status is not None:
            project_owner = getattr(getattr(instance, "project", None), "created_by", None)
            if not (user.is_staff or (project_owner is not None and getattr(project_owner, "id", None) == getattr(user, "id", None))):
                return Response({"detail": "Not allowed to change status"}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Editing other fields -> only creator or staff
            if not (user.is_staff or getattr(getattr(instance, "user", None), "id", None) == getattr(user, "id", None)):
                return Response({"detail": "Not allowed to edit this request"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        old_status = instance.status
        new_status = serializer.validated_data.get("status", old_status)
        self.perform_update(serializer)

        # if status changed, mark related notifications read
        if new_status != old_status:
            Notification.objects.filter(time_request=instance).update(is_read=True)

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Only the creator (obj.user) or staff may delete a TimeRequest.
        Project owner (recipient) is not allowed to delete someone else's request.
        """
        instance = self.get_object()
        user = request.user

        if not (user.is_staff or getattr(getattr(instance, "user", None), "id", None) == getattr(user, "id", None)):
            return Response({"detail": "Not allowed to delete this request"}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

# views.py
from rest_framework import viewsets, permissions
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')
