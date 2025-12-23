# tasks/serializers.py
from rest_framework import serializers
from django.db.models import Q

from .models import Task
from projects.models import Project, Member


class TaskSerializer(serializers.ModelSerializer):
    # Project info
    project_id = serializers.IntegerField(source="project.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)

    # Writable relations
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
    )

    assignee = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.select_related("user").all(),
        required=False,
        allow_null=True,
    )

    # assigned_by is read-only — we always set it on the server from request.user
    assigned_by = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    # Readable names
    assignee_name = serializers.SerializerMethodField(read_only=True)
    assigned_by_name = serializers.SerializerMethodField(read_only=True)

    # Helpers
    sequence_id = serializers.SerializerMethodField()
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "sequence_id",
            "project",
            "project_id",
            "project_name",
            "assignee",
            "assignee_name",
            "assigned_by",
            "assigned_by_name",
            "title",
            "due_date",
            "priority",
            "status",
            "created_at",
            "updated_at",
            "tasks_count",
        ]

        read_only_fields = (
            "sequence_id",
            "project_id",
            "assignee_name",
            "assigned_by_name",
            "tasks_count",
            "assigned_by",
        )

    # ---------- Helpers ----------
    def get_sequence_id(self, obj):
        if not obj.project or not getattr(obj, "created_at", None):
            return None
        return Task.objects.filter(
            project=obj.project
        ).filter(
            Q(created_at__lt=obj.created_at) |
            Q(created_at=obj.created_at, pk__lte=obj.pk)
        ).count()

    def _get_member_name(self, member):
        if not member:
            return None
        user = getattr(member, "user", None)
        if user:
            get_full = getattr(user, "get_full_name", None)
            if callable(get_full):
                full = user.get_full_name()
                if full:
                    return full
            if getattr(user, "username", None):
                return user.username
        if getattr(member, "name", None):
            return member.name
        try:
            return str(member)
        except Exception:
            return None

    def get_assignee_name(self, obj):
        return self._get_member_name(obj.assignee)

    def get_assigned_by_name(self, obj):
        return self._get_member_name(obj.assigned_by)

    def validate(self, data):
        project = data.get("project")
        assignee = data.get("assignee")

        if project and assignee:
            if not project.members.filter(pk=assignee.pk).exists():
                raise serializers.ValidationError(
                    {"assignee": "This member is not part of the selected project."}
                )
        return data
