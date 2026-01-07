# shifts/serializers.py

from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model

from .models import Shift, ShiftNotification, Attendance
from projects.models import Member

User = get_user_model()

# Valid tokens for working_days CSV
DAY_CHOICES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class ShiftSerializer(serializers.ModelSerializer):
    """
    Serializer for Shift model.

    - `members` is a read/write list of Member PKs.
    - Accept `working_days` as a CSV string on write (e.g. "Mon,Tue,Wed").
    - Expose `working_days` as a Python list on reads.
    - Adds explicit creator fields for reliable client-side matching:
        - created_by_id
        - created_by_username
        - created_by_display_name
    - Creates ShiftNotification rows for members added on create/update.
    """

    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
    )

    member_usernames = serializers.SerializerMethodField(read_only=True)

    # Accept CSV on input (write-only).
    working_days = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Comma-separated days (e.g. Mon,Tue,Wed)",
    )
    # Expose the raw CSV as a read-only string (optional)
    working_days_str = serializers.CharField(read_only=True, source="working_days")

    # --- Explicit creator fields for stable API ---
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_display_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=None
    )
    # ------------------------------------------------

    class Meta:
        model = Shift
        fields = [
            "id",
            "name",
            "members",
            "member_usernames",
            "working_days",
            "working_days_str",
            "timezone",
            "start_date",
            "required_hours",
            "shift_type",
            "start_time",
            "end_time",
            "repeat_option",
            "repeat_until",
            # explicit creator fields (read-only)
            "created_by_id",
            "created_by_username",
            "created_by_display_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_by_id",
            "created_by_username",
            "created_by_display_name",
            "created_at",
            "member_usernames",
            "working_days_str",
        ]

    def get_member_usernames(self, obj):
        # safe access: prefetch_related('members__user') in views recommended
        return [m.user.username for m in obj.members.all()]

    def validate(self, attrs):
        """
        - Ensure end_time > start_time if both provided.
        - If repeat_option != 'none', ensure repeat_until is provided and >= start_date.
        - Validate working_days CSV contains only allowed day tokens.
        """
        inst = getattr(self, "instance", None)

        start_time = attrs.get("start_time", getattr(inst, "start_time", None) if inst else None)
        end_time = attrs.get("end_time", getattr(inst, "end_time", None) if inst else None)
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "`end_time` must be after `start_time`."})

        repeat_option = attrs.get(
            "repeat_option",
            getattr(inst, "repeat_option", "none") if inst else "none",
        )
        repeat_until = attrs.get("repeat_until", getattr(inst, "repeat_until", None) if inst else None)
        start_date = attrs.get("start_date", getattr(inst, "start_date", None) if inst else None)
        if repeat_option and repeat_option != "none":
            if not repeat_until:
                raise serializers.ValidationError({
                    "repeat_until": "`repeat_until` is required if `repeat_option` is not 'none'."
                })
            if start_date and repeat_until < start_date:
                raise serializers.ValidationError({
                    "repeat_until": "`repeat_until` cannot be earlier than `start_date`."
                })

        wd_csv = attrs.get("working_days", None)
        if wd_csv is not None:
            day_list = [d.strip() for d in wd_csv.split(",") if d.strip()]
            invalid = [d for d in day_list if d not in DAY_CHOICES]
            if invalid:
                raise serializers.ValidationError({
                    "working_days": f"Invalid day(s): {invalid}. Must be one of {DAY_CHOICES}."
                })

        return attrs

    def create(self, validated_data):
        """
        Create Shift, set members, and create notifications for assigned members.
        The view should call serializer.save(created_by=request.user) so created_by
        will be available in validated_data. Fallback to request.user if not provided.
        """
        members_data = validated_data.pop("members", [])
        wd_csv = validated_data.pop("working_days", "")
        # created_by is read-only; use request.user from context
        created_by = self.context.get("request").user if self.context and self.context.get("request") else None

        # store working_days CSV on model field
        validated_data["working_days"] = wd_csv
        if created_by:
            validated_data["created_by"] = created_by

        with transaction.atomic():
            shift = Shift.objects.create(**validated_data)
            if members_data:
                shift.members.set(members_data)

                # create notifications for each member
                notifications = []
                for member in members_data:
                    msg = f"You've been assigned to shift '{shift.name}' starting {shift.start_date}."
                    notifications.append(
                        ShiftNotification(recipient=member, shift=shift, message=msg)
                    )
                ShiftNotification.objects.bulk_create(notifications)

        return shift

    def update(self, instance, validated_data):
        """
        Update Shift, set members (if provided), and notify newly added members only.
        """
        members_data = validated_data.pop("members", None)
        wd_csv = validated_data.pop("working_days", None)

        if wd_csv is not None:
            validated_data["working_days"] = wd_csv

        with transaction.atomic():
            # snapshot current members before update
            current_member_pks = set(instance.members.values_list("pk", flat=True))

            # perform update
            shift = super().update(instance, validated_data)

            if members_data is not None:
                new_member_pks = set(m.pk for m in members_data)
                shift.members.set(members_data)

                # compute newly added members
                added_pks = new_member_pks - current_member_pks
                if added_pks:
                    notifications = []
                    for member in members_data:
                        if member.pk in added_pks:
                            msg = f"You were added to shift '{shift.name}' (start {shift.start_date})."
                            notifications.append(
                                ShiftNotification(recipient=member, shift=shift, message=msg)
                            )
                    ShiftNotification.objects.bulk_create(notifications)

        return shift

    def to_representation(self, instance):
        """
        Convert stored CSV "Mon,Tue,Wed" into a Python list on read.
        """
        ret = super().to_representation(instance)
        wd_str = instance.working_days or ""
        ret["working_days"] = [d for d in wd_str.split(",") if d]
        return ret


class ShiftNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for ShiftNotification model (DB notifications created when members are assigned).
    """
    recipient = serializers.PrimaryKeyRelatedField(read_only=True)
    shift = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ShiftNotification
        fields = ["id", "recipient", "shift", "message", "is_read", "created_at"]


class TrackedShiftSerializer(serializers.Serializer):
    """
    Lightweight serializer used by TrackedShiftsView (returns tracked hours for each shift).
    Expecting pre-computed fields in the view.
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    start_time = serializers.TimeField(format="%H:%M")
    end_time = serializers.TimeField(format="%H:%M")
    member_usernames = serializers.ListField(child=serializers.CharField())
    tracked_hours = serializers.CharField()


# Attendance serializer (fixed read_only_fields)
class AttendanceSerializer(serializers.ModelSerializer):
    member_username = serializers.CharField(source="member.user.username", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "member",
            "member_username",
            "shift",
            "shift_name",
            "date",
            "login_time",
            "status",
            "late_minutes",
            "tracked_seconds",
            "created_at",
        ]
        read_only_fields = tuple(fields)


