# leaveapp/serializers.py

from rest_framework import serializers
from django.utils import timezone
from .models import LeavePolicy, LeaveRequest
from projects.models import Member

class LeavePolicySerializer(serializers.ModelSerializer):
    """
    List / create leave policies (e.g. "Leave", "Sick Leave").
    """
    class Meta:
        model = LeavePolicy
        fields = ["id", "name", "is_paid", "created_on"]
        read_only_fields = ["id", "created_on"]


class LeaveRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for LeaveRequest:
      - We mark `member` and `created_by` as read‐only so they get set from the current user.
      - We expose additional display fields (e.g. member_username, policy_name, etc.).
    """

    member_username = serializers.CharField(source="member.user.username", read_only=True)
    member_team = serializers.CharField(source="member.team", read_only=True)
    policy_name = serializers.CharField(source="policy.name", read_only=True)
    paid = serializers.BooleanField(source="policy.is_paid", read_only=True)

    created_by_username = serializers.CharField(source="created_by.user.username", read_only=True)
    approved_by_username = serializers.CharField(
        source="approved_by.user.username", read_only=True, allow_null=True
    )

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "member",               # read‐only: current user will be set automatically
            "member_username",
            "member_team",
            "policy",
            "policy_name",
            "paid",
            "reason",
            "start_date",
            "end_date",
            "total_days",
            "status",
            "created_on",
            "created_by",           # read‐only
            "created_by_username",
            "approved_on",
            "approved_by",          # read‐only
            "approved_by_username",
            "rejection_reason",
        ]
        read_only_fields = [
            "id",
            "member",
            "member_username",
            "member_team",
            "policy_name",
            "paid",
            "total_days",
            "status",
            "created_on",
            "created_by",
            "created_by_username",
            "approved_on",
            "approved_by",
            "approved_by_username",
            "rejection_reason",
        ]

    def create(self, validated_data):
        """
        When a user creates a LeaveRequest, we automatically set:
        - member = request.user's Member
        - created_by = same member
        - status = "pending"
        """
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        try:
            member = Member.objects.get(user=request.user)
        except Member.DoesNotExist:
            raise serializers.ValidationError("No Member record found for user.")

        # Pull out the policy, reason, dates from validated_data:
        policy = validated_data.get("policy")
        reason = validated_data.get("reason")
        start_date = validated_data.get("start_date")
        end_date = validated_data.get("end_date")

        # Create the LeaveRequest with correct fields:
        leave_req = LeaveRequest.objects.create(
            member=member,
            policy=policy,
            reason=reason,
            start_date=start_date,
            end_date=end_date,
            created_by=member,
            status="pending",
            approved_on=None,
            approved_by=None,
            rejection_reason=None,
        )
        return leave_req
