# tasks/views.py
from rest_framework import generics
from rest_framework.exceptions import ParseError

from projects.models import Member
from projects.views import assign_user_to_project
from .models import Task
from .serializers import TaskSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated,AllowAny
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions


class TaskCreateView(generics.CreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        task = serializer.save()

        if task.assignee is None:
            return

        member = task.assignee
        if not hasattr(member, "user") or member.user is None:
            raise ParseError("Assigned member must have an associated user.")

        assign_user_to_project(task.project, member.user)

class TaskListView(generics.ListAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all()
        project_id = self.request.query_params.get("project")
        if project_id is None:
            raise ParseError("`project` query parameter is required.")
        return qs.filter(project_id=project_id)

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]
    
class MyAssignedTasksView(generics.ListAPIView):
    """
    GET /api/tasks/my/
      - If authenticated: find (or create) Member(user=request.user) and return Task.objects.filter(assignee=that Member).
      - If anonymous: require ?assignee=<member_id> to return tasks for that Member.
    """
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user

        # 1) If the user is logged in, ensure a Member row exists
        if user and user.is_authenticated:
            member, _created = Member.objects.get_or_create(user=user)
            return Task.objects.filter(assignee=member)

        # 2) Anonymous: require ?assignee=<member_id>
        member_id = self.request.query_params.get("assignee")
        if not member_id:
            raise ParseError("`assignee` query parameter is required for anonymous access.")
        return Task.objects.filter(assignee_id=member_id)