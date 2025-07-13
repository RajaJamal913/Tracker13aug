from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, Member
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from .models import Project, Member

User = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Member
        fields = ("id", "user", "role", "username")


class ProjectSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    tasks_count = serializers.IntegerField(read_only=True)

    
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
        if "created_by" not in validated_data:
            validated_data["created_by"] = self.context["request"].user

        # 1) Check for PK mode
        members_from_pks = validated_data.pop("members", None)
        # 2) If nested mode (raw JSON “members”), DRF puts a list of dicts into members_data_raw
        members_data_raw = self.initial_data.get("members", None)

        project = Project.objects.create(**validated_data)

        # If the client used `member_ids: [1,2,3]`, then `members_from_pks` is a list of Member instances.
        if members_from_pks is not None:
            project.members.set(members_from_pks)

        # If instead the client used nested `"members": [{…}, {…}]`
        elif isinstance(members_data_raw, list):
            for mdata in members_data_raw:
                # Example: you have to convert each dict into a real Member instance.
                # Maybe Member has a field “user_id” or “role” in those dicts.
                member_obj, created = Member.objects.get_or_create(
                    id=mdata.get("id"),
                    defaults={
                        "role": mdata.get("role", ""),
                        # … any other defaults …
                    }
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
                member_obj, created = Member.objects.get_or_create(
                    id=mdata.get("id"),
                    defaults={"role": mdata.get("role", "")}
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
    
    