# timesheet/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TimeRequest, Notification

User = get_user_model()


class TimeRequestSerializer(serializers.ModelSerializer):
    # display fields
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)

    # permission/debug flags set server-side
    is_creator = serializers.SerializerMethodField(read_only=True)
    can_approve = serializers.SerializerMethodField(read_only=True)
    project_owner = serializers.SerializerMethodField(read_only=True)  # owner id (or None)

    class Meta:
        model = TimeRequest
        fields = [
            "id",
            "user",
            "user_id",
            "project",
            "project_name",
            "task",
            "task_title",
            "date",
            "time_from",
            "time_to",
            "requested_duration",
            "description",
            "status",
            "created_at",
            "updated_at",
            # server-calculated flags
            "is_creator",
            "can_approve",
            "project_owner",
        ]
        read_only_fields = (
            "user",
            "user_id",
            "requested_duration",
            "created_at",
            "updated_at",
            "is_creator",
            "can_approve",
            "project_name",
            "task_title",
            "project_owner",
        )

    def create(self, validated_data):
        # attach the requesting user (same behaviour as before)
        request = self.context.get("request", None)
        if request and getattr(request, "user", None) and not request.user.is_anonymous:
            validated_data["user"] = request.user
        return super().create(validated_data)

    def get_is_creator(self, obj):
        request = self.context.get("request", None)
        if not request or request.user.is_anonymous:
            return False
        # compare by id (safe)
        try:
            return getattr(obj.user, "id", None) == getattr(request.user, "id", None)
        except Exception:
            return False

    def get_project_owner(self, obj):
        """
        Return the project owner's id if available, else None.
        This is helpful for debugging the front-end (but the front-end should rely on can_approve).
        """
        try:
            owner = getattr(getattr(obj, "project", None), "created_by", None)
            return getattr(owner, "id", None) if owner else None
        except Exception:
            return None

    def get_can_approve(self, obj):
        """
        True when request.user may approve/reject:
          - staff users, or
          - the owner of the linked project (project.created_by)
        """
        request = self.context.get("request", None)
        if not request or request.user.is_anonymous:
            return False

        user = request.user

        # staff may approve
        if getattr(user, "is_staff", False):
            return True

        # project owner may approve
        try:
            owner = getattr(getattr(obj, "project", None), "created_by", None)
            if owner and getattr(owner, "id", None) == getattr(user, "id", None):
                return True
        except Exception:
            # swallow any attribute errors and return False
            return False

        return False


class NotificationSerializer(serializers.ModelSerializer):
    # existing convenience fields
    time_request_id = serializers.IntegerField(source="time_request.id", read_only=True)
    task_id = serializers.IntegerField(source="task.id", read_only=True)

    # helpful recipient info
    recipient = serializers.StringRelatedField(read_only=True)
    recipient_id = serializers.IntegerField(source="recipient.id", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "time_request_id", "task_id", "verb", "created_at", "is_read", "recipient", "recipient_id"]
        read_only_fields = ["id", "time_request_id", "task_id", "verb", "created_at", "recipient", "recipient_id"]
