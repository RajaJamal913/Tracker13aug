# realtimemonitoring/serializers.py

from rest_framework import serializers
from django.utils import timezone
from projects.models import Member
from .models import  WorkSession

class WorkSessionStatusSerializer(serializers.ModelSerializer):
    # Return the Member’s primary key (i.e. Member.id), not the User’s ID
    member = serializers.IntegerField(source="member.id", read_only=True)
    total_seconds = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = WorkSession
        fields = ["member", "status", "total_seconds"]
        read_only_fields = ["member", "status", "total_seconds"]

    def get_status(self, obj):
        return "active" if obj.is_running else "paused"
    

from .models import BreakPolicy, BreakSession, WorkSession
# realtimemonitoring/serializers.py
from rest_framework import serializers
from django.utils import timezone

from projects.models import Member
from .models import BreakPolicy, BreakSession, WorkSession


class BreakPolicySerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating/listing BreakPolicy.
    We show `members` as a list of member IDs.
    """
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
        required=False
    )

    class Meta:
        model = BreakPolicy
        fields = [
            "id",
            "name",
            "members",
            "apply_to_new",
            "max_minutes_per_day",
            "type",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BreakSessionStatusSerializer(serializers.ModelSerializer):
    """
    Serializer that returns:
      - which member
      - which policy (by name)
      - current break status ("active" / "paused")
      - total_seconds so far
    """
    member = serializers.IntegerField(source="member.user.id", read_only=True)
    policy_name = serializers.CharField(source="policy.name", read_only=True, default="")
    total_seconds = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = BreakSession
        fields = [
            "member",
            "policy_name",
            "status",
            "total_seconds",
        ]

    def get_status(self, obj):
        return "active" if obj.is_running else "paused"
