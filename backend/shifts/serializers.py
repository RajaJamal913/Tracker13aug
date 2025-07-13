# shifts/serializers.py

from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from .models import Shift
from projects.models import Member   # Adjust if Member is in a different app



# We will validate that each “working_days” token is one of these:
DAY_CHOICES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


User = get_user_model()

class ShiftSerializer(serializers.ModelSerializer):
    # Write-only: list of Member PKs
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
        write_only=True,
    )
    # Remove write_only so that DRF will output "members": [<member ids>] on GET
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Member.objects.all(),
        # write_only=True,   ← comment this out (or remove entirely)
    )

     # Read-only: list of usernames (pulled from each Member)
    member_usernames = serializers.SerializerMethodField(read_only=True)

     # Instead of a ListField, we use CharField for CSV input (e.g. "Mon,Tue,Wed")
    working_days = serializers.CharField(
         write_only=True,
         help_text="Comma-separated days (e.g. Mon,Tue,Wed)",
     )
     # Read-only: the raw CSV behind the scenes
    working_days_str = serializers.CharField(read_only=True, source="working_days")

    created_by = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
         model = Shift
         fields = [
             "id",
             "name",
             "members",           # ← since write_only is gone, this will now appear on GET
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
             "created_by",
             "created_at",
         ]
         read_only_fields = [
             "id",
             "created_by",
             "created_at",
             "member_usernames",
             "working_days_str",
         ]

    def get_member_usernames(self, obj):
         return [m.user.username for m in obj.members.all()]

    def validate(self, attrs):
         """
         - Ensure end_time > start_time.
         - If repeat_option != 'none', ensure repeat_until is provided and >= start_date.
         - Validate that working_days (CSV) only contains valid day codes.
         """
         # 1) Time logic
         start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
         end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
         if start_time and end_time and end_time <= start_time:
             raise ValidationError({"end_time": "`end_time` must be after `start_time`."})

         # 2) Repeat logic
         repeat_option = attrs.get("repeat_option", getattr(self.instance, "repeat_option", "none"))
         repeat_until = attrs.get("repeat_until", getattr(self.instance, "repeat_until", None))
         start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
         if repeat_option != "none":
             if not repeat_until:
                 raise ValidationError({"repeat_until": "`repeat_until` is required if `repeat_option` is not 'none'."})
             if start_date and repeat_until < start_date:
                 raise ValidationError({"repeat_until": "`repeat_until` cannot be earlier than `start_date`."})

         # 3) Validate working_days CSV
         wd_csv = attrs.get("working_days", None)
         if wd_csv is not None:
             day_list = [d.strip() for d in wd_csv.split(",") if d.strip()]
             invalid = [d for d in day_list if d not in DAY_CHOICES]
             if invalid:
                 raise ValidationError({
                     "working_days": f"Invalid day(s): {invalid}. Must be one of {DAY_CHOICES}."
                 })

         return attrs

    def create(self, validated_data):
         members_data = validated_data.pop("members", [])
         wd_csv = validated_data.pop("working_days", "")
         validated_data["working_days"] = wd_csv
         validated_data["created_by"] = self.context["request"].user

         shift = Shift.objects.create(**validated_data)
         if members_data:
             shift.members.set(members_data)
         return shift

    def update(self, instance, validated_data):
         members_data = validated_data.pop("members", None)
         wd_csv = validated_data.pop("working_days", None)

         if wd_csv is not None:
             validated_data["working_days"] = wd_csv

         shift = super().update(instance, validated_data)
         if members_data is not None:
             shift.members.set(members_data)
         return shift

    def to_representation(self, instance):
         """
         Convert the stored CSV "Mon,Tue,Wed" into a Python list on read.
         """
         ret = super().to_representation(instance)
         wd_str = instance.working_days or ""
         ret["working_days"] = [d for d in wd_str.split(",") if d]
         return ret

# your_app/serializers.py
# shifts/serializers.py
# shifts/serializers.py
from rest_framework import serializers

class TrackedShiftSerializer(serializers.Serializer):
    id               = serializers.IntegerField()
    name             = serializers.CharField()
    start_time       = serializers.TimeField(format="%H:%M")
    end_time         = serializers.TimeField(format="%H:%M")
    member_usernames = serializers.ListField(child=serializers.CharField())
    tracked_hours    = serializers.CharField()
