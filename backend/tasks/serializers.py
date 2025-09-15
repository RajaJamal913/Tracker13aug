# tasks/serializers.py
from rest_framework import serializers
from django.db.models import Q

from .models import Task
from projects.models import Project, Member

class TaskSerializer(serializers.ModelSerializer):
    # Always include a numeric project_id in responses (or null)
    project_id = serializers.IntegerField(source='project.id', read_only=True)
      # simpler: pull the project name directly (no custom method needed)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    # Accept project by PK on writes (optional)
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
    )

    # Ensure assignee is resolved to a Member instance on write
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        required=False,
        allow_null=True,
    )

    sequence_id = serializers.SerializerMethodField()
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "sequence_id",
            "project",
            "project_id",     # <-- new stable numeric field
            "project_name",   # <- new
            "assignee",
            "title",
            "due_date",
            "priority",
            "status",
            "created_at",
            "updated_at",
            "tasks_count",
        ]
        read_only_fields = ("sequence_id", "project_id",)

    def get_sequence_id(self, obj):
        # handle nullable project gracefully
        return Task.objects.filter(
            project=obj.project
        ).filter(
            Q(created_at__lt=obj.created_at) | Q(created_at=obj.created_at, pk__lte=obj.pk)
        ).count()

    def validate(self, data):
        """
        If you only want to allow assigning a task to someone who is
        already a member of that project, keep this. Otherwise remove it.
        Note: data may be partial on PATCH, so we use get() and allow missing keys.
        """
        project = data.get("project")
        assignee = data.get("assignee")

        if project and assignee:
            # assignee is a Member instance because of PrimaryKeyRelatedField
            if not project.members.filter(pk=assignee.pk).exists():
                raise serializers.ValidationError({
                    "assignee": "This member isn’t part of the given project."
                })
        return data
