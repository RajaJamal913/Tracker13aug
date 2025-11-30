from rest_framework import generics
from rest_framework.exceptions import ParseError

from projects.models import Member
from projects.views import assign_user_to_project
from .models import Task
from .serializers import TaskSerializer
from rest_framework.permissions import AllowAny


class TaskCreateView(generics.CreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        # save then ensure the assignee (Member) has a linked User added to the project
        task = serializer.save()

        if task.assignee is None:
            return

        member = task.assignee
        if not hasattr(member, "user") or member.user is None:
            raise ParseError("Assigned member must have an associated user.")

        assign_user_to_project(task.project, member.user)


class TaskListView(generics.ListAPIView):
    """
    GET /api/tasks/
    Optional query param: ?project=<project_id>
    If ?project is present it filters by project_id; otherwise returns all tasks.
    """
    permission_classes = [AllowAny]
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.all()
        project_id = self.request.query_params.get("project")
        if project_id:
            return qs.filter(project_id=project_id)
        return qs


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / PUT / DELETE /api/tasks/<pk>/
    - Note: no custom permission here (AllowAny). If you want to restrict who can PATCH/DELETE,
      add permission logic later (e.g. only assignee or staff).
    - perform_update will run assign_user_to_project if assignee changed in the update payload.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]

    def perform_update(self, serializer):
        """
        After saving changes, if assignee changed and the new assignee is linked to a user,
        ensure that user is assigned to the task.project via assign_user_to_project.
        """
        # fetch current instance for comparison
        instance_before = self.get_object()
        task = serializer.save()

        # If assignee changed, ensure the member has a user and add to project
        new_assignee = getattr(task, "assignee", None)
        if new_assignee is not None and instance_before.assignee != new_assignee:
            member = new_assignee
            if hasattr(member, "user") and member.user:
                assign_user_to_project(task.project, member.user)


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
