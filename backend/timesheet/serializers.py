from rest_framework import serializers
from .models import TimeRequest

from django.db import models
from django.conf import settings
from datetime import datetime, date, timedelta

from projects.models import Project
from tasks.models import Task

# timesheet/serializers.py

from rest_framework import serializers
from .models import TimeRequest, Notification

class TimeRequestSerializer(serializers.ModelSerializer):
    # Nested read‑only fields for display
    user = serializers.StringRelatedField(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    task_title   = serializers.CharField(source="task.title",   read_only=True)

    class Meta:
        model = TimeRequest
        fields = [
            "id",
            "user",
            "project",      # still accept integer FK on write
            "project_name",
            "task",         # integer FK on write
            "task_title",
            "date",
            "time_from",
            "time_to",
            "requested_duration",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "user",
            "requested_duration",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        # attach the requesting user
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

# serializers.py
# serializers.py
class NotificationSerializer(serializers.ModelSerializer):
    time_request_id = serializers.IntegerField(source="time_request.id", read_only=True)
    task_id = serializers.IntegerField(source="task.id", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "time_request_id", "task_id", "verb", "created_at", "is_read"]
        read_only_fields = ["id", "time_request_id", "task_id", "verb", "created_at"]
