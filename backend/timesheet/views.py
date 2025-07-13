# timesheet/views.py
from rest_framework import generics, permissions
from .models import TimeEntry
from .serializers import TimeEntrySerializer
from rest_framework.exceptions import PermissionDenied

class TimeEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/addtime/      → list current user's entries (auth required)
    POST /api/addtime/      → create new entry (auth required)
    """
    queryset = TimeEntry.objects.select_related('project', 'task', 'user')
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            # Anonymous users see no entries
            return TimeEntry.objects.none()
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        # Only allow creation by authenticated users
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to create time entries.")
        serializer.save(user=user)

class TimeEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TimeEntry.objects.select_related('project', 'task', 'user')
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user:
            raise PermissionDenied("Cannot access entries of another user.")
        return obj
    


