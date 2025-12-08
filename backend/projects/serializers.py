# serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

from .models import Project, Member, Invitation, Team

User = get_user_model()

class MemberSimpleSerializer(serializers.ModelSerializer):
    """
    Small serializer shaped for the frontend MultiSelect:
    { id, name, email, experience }
    (unchanged — keep the small payload the frontend expects)
    """
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    experience = serializers.IntegerField(read_only=True)

    class Meta:
        model = Member
        fields = ("id", "name", "email", "experience")

    def get_name(self, obj):
        user = getattr(obj, "user", None)
        if not user:
            return f"Member#{obj.pk}"
        # prefer full name if available
        get_full = getattr(user, "get_full_name", None)
        if callable(get_full):
            full = user.get_full_name()
            if full:
                return full
        return getattr(user, "username", "") or f"Member#{obj.pk}"


class MemberSerializer(serializers.ModelSerializer):
    """
    Serializer for Member objects. Note: `user` is writeable by PK but in
    most flows you'd want the endpoint to use request.user instead of passing user id.
    """
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    username = serializers.CharField(source="user.username", read_only=True)

    # expose new fields
    experience = serializers.IntegerField(required=False, allow_null=True)
    skills = serializers.CharField(required=False, allow_blank=True)
    developer_type = serializers.ChoiceField(
        choices=Member.DEVELOPER_TYPE_CHOICES,
        required=False,
        allow_null=True
    )
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Member
        fields = ("id", "user", "role", "username", "experience", "skills", "developer_type", "updated_at")
        read_only_fields = ("id", "username", "updated_at")


class MemberUpdateSerializer(serializers.Serializer):
    """
    Minimal serializer used to accept the frontend role/experience/skills payload.
    Example payload:
      { "role": "member", "experience": 3, "skills": "React, Django", "developer_type": "web" }
    """
    role = serializers.CharField(max_length=255, required=True)
    experience = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    skills = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    developer_type = serializers.ChoiceField(
        choices=Member.DEVELOPER_TYPE_CHOICES,
        required=False,
        allow_null=True
    )

    def validate_role(self, value):
        # optional normalization (keep as provided)
        return value.strip() if isinstance(value, str) else value

    def validate_developer_type(self, value):
        # normalize/strip if it's a string; ChoiceField already validates allowed values
        return value.strip() if isinstance(value, str) else value

class ProjectSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    tasks_count = serializers.IntegerField(read_only=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    created_by_id = serializers.SlugRelatedField(
        queryset=User.objects.all(),
        source="created_by",
        slug_field="username",
        write_only=True,
        required=False,
    )

    members = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "billable",
            "start_date",
            "end_date",
            "time_estimate",
            "budget_estimate",
            "notes",
            "created_at",
            "created_by",
            "created_by_id",
            "tasks_count",
            "members",
            "properties",
        )
        read_only_fields = ("id", "created_at", "created_by", "properties",)

    def create(self, validated_data):
        # ensure created_by present
        if "created_by" not in validated_data:
            request = self.context.get("request", None)
            if request and hasattr(request, "user"):
                validated_data["created_by"] = request.user

        members_from_pks = validated_data.pop("members", None)
        members_data_raw = self.initial_data.get("members", None)

        project = Project.objects.create(**validated_data)

        if members_from_pks is not None:
            project.members.set(members_from_pks)
        elif isinstance(members_data_raw, list):
            for mdata in members_data_raw:
                member_obj, _ = Member.objects.get_or_create(
                    id=mdata.get("id"),
                    defaults={"role": mdata.get("role", "")},
                )
                project.members.add(member_obj)

        return project

    def update(self, instance, validated_data):
        members_from_pks = validated_data.pop("members", None)
        members_data_raw = self.initial_data.get("members", None)

        project = super().update(instance, validated_data)

        if members_from_pks is not None:
            project.members.set(members_from_pks)
        elif isinstance(members_data_raw, list):
            project.members.clear()
            for mdata in members_data_raw:
                member_obj, _ = Member.objects.get_or_create(
                    id=mdata.get("id"),
                    defaults={"role": mdata.get("role", "")},
                )
                project.members.add(member_obj)

        return project

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        usernames = []
        for m in instance.members.all():
            try:
                usernames.append(m.user.username)
            except ObjectDoesNotExist:
                usernames.append(f"Member#{m.pk}")
        ret["members"] = usernames
        return ret


class InvitationSerializer(serializers.ModelSerializer):
    # allow omitting project when frontend sends create_project + project_name
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), required=False, allow_null=True
    )

    # helper write-only fields for the frontend convenience (create project + invite in one call)
    create_project = serializers.BooleanField(write_only=True, required=False, default=False)
    project_name = serializers.CharField(write_only=True, required=False, allow_blank=False)

    created_by = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
        model = Invitation
        fields = (
            "id",
            "email",
            "project",
            "role",
            "created_by",
            "created_at",
            "accepted_at",
            "expires_at",
            "token",
            # write-only helpers
            "create_project",
            "project_name",
        )
        read_only_fields = ("created_by", "created_at", "token", "expires_at")

    def validate(self, attrs):
        """
        Ensure either an existing project is provided OR the client asked to create one
        (create_project + project_name). The view still handles actual creation.
        """
        request = self.context.get("request", None)

        project_provided = attrs.get("project", None) is not None
        create_flag = attrs.get("create_project", False)
        project_name = attrs.get("project_name", None)

        # If the request used body keys instead of serializer fields (rare), check request.data as fallback
        if request is not None:
            if not create_flag:
                create_flag = bool(request.data.get("create_project") or request.data.get("createProject"))
            if not project_name:
                project_name = request.data.get("project_name") or request.data.get("projectName")

        if not project_provided and not create_flag:
            raise serializers.ValidationError({
                "project": "Either provide an existing project id or set create_project=true with project_name."
            })

        if create_flag and (not project_name or str(project_name).strip() == ""):
            raise serializers.ValidationError({
                "project_name": "project_name is required when create_project is true."
            })

        return super().validate(attrs)

    def create(self, validated_data):
        # store helper flags locally then remove them from validated_data
        create_flag = validated_data.pop("create_project", False)
        project_name = validated_data.pop("project_name", None)

        # set created_by from request if available
        request = self.context.get("request", None)
        if request and hasattr(request, "user") and not request.user.is_anonymous:
            validated_data["created_by"] = request.user

        return super().create(validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # add friendly project_name if available
        try:
            ret["project_name"] = instance.project.name if instance.project else None
        except Exception:
            ret["project_name"] = None
        return ret


class TeamSerializer(serializers.ModelSerializer):
    members = MemberSimpleSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(), many=True, write_only=True, required=False
    )
    created_by = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
        model = Team
        fields = ("id", "name", "members", "member_ids", "created_by", "created_at")
        read_only_fields = ("id", "members", "created_by", "created_at")

    def create(self, validated_data):
        member_objs = validated_data.pop("member_ids", [])
        request = self.context.get("request", None)
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        team = Team.objects.create(**validated_data)
        if member_objs:
            team.members.set(member_objs)
        return team

    def update(self, instance, validated_data):
        # allow updating name and members via member_ids
        member_objs = validated_data.pop("member_ids", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if member_objs is not None:
            instance.members.set(member_objs)
        return instance