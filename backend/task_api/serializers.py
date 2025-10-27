from rest_framework import serializers
from django.apps import apps
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import TaskAI

User = get_user_model()

class TaskAISerializer(serializers.ModelSerializer):
    selectedProjectId = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    project = serializers.PrimaryKeyRelatedField(read_only=True)

    # New: project_name exposed to frontend so clients don't need extra requests
    project_name = serializers.SerializerMethodField(read_only=True)

    # Allow client to pass an assignee id when creating (write-only)
    assignee_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # Read-only fields to return assignment & AI metadata
    assignee = serializers.PrimaryKeyRelatedField(read_only=True)
    assigned_by = serializers.PrimaryKeyRelatedField(read_only=True)
    assigned_at = serializers.DateTimeField(read_only=True)

    ai_suggested = serializers.BooleanField(read_only=True)
    ai_confidence = serializers.IntegerField(read_only=True, allow_null=True)
    ai_reason = serializers.CharField(read_only=True, allow_null=True)
    ai_meta = serializers.JSONField(read_only=True)

    # explicit lock field (read-only)
    assignment_locked = serializers.BooleanField(read_only=True)

    # Friendly assignee display fields for the frontend
    assignee_name = serializers.SerializerMethodField(read_only=True)
    assignee_full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TaskAI
        fields = [
            "id",
            "selectedProjectId",
            "project",
            "project_name",   # <-- added so frontend can display name directly
            "title",
            "project_type",

            "web_desc",
            "mobile_desc",
            "figma_desc",
            "priority",
            "deadline",
            "hours",
            "tags",
            "created_by",
            "created_at",
            "updated_at",
            "extra",
            # assignment fields
            "assignee_id", "assignee", "assigned_by", "assigned_at",
            # ai metadata
            "ai_suggested", "ai_confidence", "ai_reason", "ai_meta",
            # explicit lock field
            "assignment_locked",
            # friendly assignee display
            "assignee_name", "assignee_full_name",
        ]
        read_only_fields = (
            "created_by",
            "created_at",
            "updated_at",
            "assignee",
            "assigned_by",
            "assigned_at",
            "ai_suggested",
            "ai_confidence",
            "ai_reason",
            "ai_meta",
            "assignment_locked",
            "assignee_name",
            "assignee_full_name",
            "project_name",   # ensure project_name is read-only
        )

    def get_project_name(self, obj):
        """
        Return a human-friendly project name for the serializer.
        Tries common attributes (name, title) and falls back to str(project).
        """
        try:
            proj = getattr(obj, "project", None)
            if proj:
                return getattr(proj, "name", None) or getattr(proj, "title", None) or str(proj)
        except Exception:
            pass
        return None

    def get_assignee_name(self, obj):
        try:
            if obj.assignee:
                return getattr(obj.assignee, "username", None) or (getattr(obj.assignee, "get_full_name", None) and obj.assignee.get_full_name()) or f"User#{getattr(obj.assignee, 'pk', '')}"
        except Exception:
            return None
        return None

    def get_assignee_full_name(self, obj):
        try:
            if obj.assignee:
                get_full = getattr(obj.assignee, "get_full_name", None)
                if callable(get_full):
                    full = obj.assignee.get_full_name()
                    return full or getattr(obj.assignee, "username", None) or f"User#{getattr(obj.assignee, 'pk', '')}"
        except Exception:
            return None
        return None

    def create(self, validated_data):
        # Handle selectedProjectId -> project
        project_id = validated_data.pop("selectedProjectId", None)
        Project = apps.get_model("projects", "Project")
        if project_id:
            try:
                validated_data["project"] = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                raise serializers.ValidationError({"selectedProjectId": "Invalid project id"})

        # Handle optional assignee_id (write-only)
        assignee_id = validated_data.pop("assignee_id", None)
        request = self.context.get("request")

        # set created_by from request if authenticated
        if request and hasattr(request, "user") and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        # assign assignee if provided (validate user existence)
        if assignee_id is not None:
            try:
                user = User.objects.get(pk=assignee_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"assignee_id": "Assignee user not found."})

            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError({"assignee_id": "Authentication required to assign."})

            # this is an explicit manual assignment - ensure ai flags are not set
            validated_data["assignee"] = user
            validated_data["assigned_by"] = request.user
            validated_data["assigned_at"] = timezone.now()

            # Explicit manual assignment => clear ai suggestion metadata if present
            if "ai_suggested" in validated_data:
                validated_data["ai_suggested"] = False
            if "ai_confidence" in validated_data:
                validated_data["ai_confidence"] = None
            if "ai_reason" in validated_data:
                validated_data["ai_reason"] = ""
            if "ai_meta" in validated_data:
                validated_data["ai_meta"] = {}

        return super().create(validated_data)

# serializers.py (append)

from rest_framework import serializers
from .models import TaskReview, TaskAI
from projects.models import Member

class TaskReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.SerializerMethodField(read_only=True)
    reviewer_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = TaskReview
        fields = ["id", "task", "text", "rating", "created_at", "updated_at", "reviewer", "reviewer_id"]
        read_only_fields = ["id", "created_at", "updated_at", "reviewer", "task"]

    def get_reviewer(self, obj):
        if obj.reviewer:
            return {
                "id": obj.reviewer.pk,
                "username": getattr(obj.reviewer.user, "username", None),
                "role": obj.reviewer.role,
            }
        return None

    def validate_rating(self, value):
        if value is None:
            return value
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def create(self, validated_data):
        # task must be passed via view's context (we'll ensure that from view)
        request = self.context.get("request")
        task = self.context.get("task")
        if not task:
            raise serializers.ValidationError("Task context missing.")

        reviewer_member = None
        # If client provided reviewer_id (rare), allow it for admin usage; otherwise use request.user
        reviewer_id = validated_data.pop("reviewer_id", None)
        if reviewer_id:
            try:
                reviewer_member = Member.objects.get(pk=reviewer_id)
            except Member.DoesNotExist:
                raise serializers.ValidationError({"reviewer_id": "Member not found."})
        else:
            if request and getattr(request, "user", None) and request.user.is_authenticated:
                try:
                    reviewer_member = Member.objects.get(user=request.user)
                except Member.DoesNotExist:
                    reviewer_member = None

        review = TaskReview.objects.create(task=task, reviewer=reviewer_member, **validated_data)
        return review
