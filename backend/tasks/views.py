# tasks/views.py

from django.db.models import Count
from rest_framework import generics
from rest_framework.exceptions import ParseError, PermissionDenied
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.authentication import TokenAuthentication

from projects.models import Member
from projects.views import assign_user_to_project
from .models import Task
from .serializers import TaskSerializer


class TaskCreateView(generics.CreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    # 🔥 IMPORTANT: Disable SessionAuthentication (prevents CSRF 403)
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """
        Always set assigned_by to the current authenticated user.
        Anonymous users are not allowed to create tasks.
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to create tasks.")

        assigned_by_member, _ = Member.objects.get_or_create(user=user)

        # Save task with correct assigned_by (client cannot override this)
        task = serializer.save(assigned_by=assigned_by_member)

        # Ensure assignee's user is added to the project
        if task.assignee:
            member = task.assignee
            if not getattr(member, "user", None):
                raise ParseError("Assigned member must have an associated user.")
            assign_user_to_project(task.project, member.user)


class TaskListView(generics.ListAPIView):
    serializer_class = TaskSerializer

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = (
            Task.objects
            .select_related("project", "assignee__user", "assigned_by__user")
            .annotate(tasks_count=Count("assignee__tasks"))
        )

        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return (
            Task.objects
            .select_related("project", "assignee__user", "assigned_by__user")
            .annotate(tasks_count=Count("assignee__tasks"))
        )

    def perform_update(self, serializer):
        """
        On update:
        - Always record who made the change as assigned_by
        - Especially important when assignee changes
        """
        instance_before = self.get_object()
        user = self.request.user

        assigned_by_member = None
        if user and user.is_authenticated:
            assigned_by_member, _ = Member.objects.get_or_create(user=user)

        # Save incoming changes first
        task = serializer.save()

        # Always update assigned_by if we have an authenticated user
        if assigned_by_member:
            if (
                instance_before.assignee != task.assignee
                or task.assigned_by != assigned_by_member
            ):
                task.assigned_by = assigned_by_member
                task.save(update_fields=["assigned_by", "updated_at"])

        # Ensure assignee is part of the project
        if task.assignee and getattr(task.assignee, "user", None):
            assign_user_to_project(task.project, task.assignee.user)


class MyAssignedTasksView(generics.ListAPIView):
    """
    Returns tasks assigned to the current logged-in user.
    Anonymous users must pass ?assignee=<member_id>
    """
    serializer_class = TaskSerializer

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user

        # Logged-in user
        if user and user.is_authenticated:
            member, _ = Member.objects.get_or_create(user=user)
            return (
                Task.objects.filter(assignee=member)
                .select_related("project", "assignee__user", "assigned_by__user")
                .annotate(tasks_count=Count("assignee__tasks"))
            )

        # Anonymous access (read-only)
        member_id = self.request.query_params.get("assignee")
        if not member_id:
            raise ParseError("`assignee` query parameter is required for anonymous access.")

        return (
            Task.objects.filter(assignee_id=member_id)
            .select_related("project", "assignee__user", "assigned_by__user")
            .annotate(tasks_count=Count("assignee__tasks"))
        )
