

# tasks/serializers.py
from rest_framework import serializers
from .models import Task
from django.db.models import Q
class TaskSerializer(serializers.ModelSerializer):
    sequence_id = serializers.SerializerMethodField()
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "sequence_id",
            "project",
            "assignee",
            "title",
            "due_date",
            "priority",
            "status",
            "created_at",
            "updated_at",
            "tasks_count",
        ]
        read_only_fields = ("sequence_id",)

    def get_sequence_id(self, obj):
        return Task.objects.filter(
            project=obj.project
        ).filter(
            Q(created_at__lt=obj.created_at) | Q(created_at=obj.created_at, pk__lte=obj.pk)
        ).count()

    def validate(self, data):
        """
        If you only want to allow assigning a task to someone who is
        already a member of that project, keep this. Otherwise, you can
        remove this entire method and let the post_save signal auto-add.
        """
        project = data.get("project")
        assignee = data.get("assignee")

        if project and assignee:
            if not project.members.filter(pk=assignee.pk).exists():
                raise serializers.ValidationError({
                    "assignee": "This member isn’t part of the given project."
                })
        return data