# leaveapp/admin.py

from django.contrib import admin
from .models import LeavePolicy, LeaveRequest

@admin.register(LeavePolicy)
class LeavePolicyAdmin(admin.ModelAdmin):
    list_display = ("name", "is_paid", "created_on")
    list_filter = ("is_paid",)
    search_fields = ("name",)
    ordering = ("name",)

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "member",
        "member_team",       # custom method below
        "policy",
        "start_date",
        "end_date",
        "total_days",
        "status",
        "created_on",
        "approved_on",
    )
    list_filter = ("status", "policy", "created_on")
    search_fields = ("member__user__username", "policy__name", "reason")
    ordering = ("-created_on",)
    date_hierarchy = "created_on"
    readonly_fields = ("total_days", "created_on", "approved_on")

    def member_team(self, obj):
        return obj.member.team
    member_team.short_description = "Team"

    def approve_reject_buttons(self, obj):
        """
        Optionally, you can add custom buttons or links here; for
        simplicity we just display the status.
        """
        return obj.get_status_display()
    approve_reject_buttons.short_description = "Status"

    fieldsets = (
        (None, {
            "fields": (
                "member",
                "policy",
                "reason",
                ("start_date", "end_date"),
                "total_days",
            )
        }),
        ("Processing", {
            "fields": (
                "status",
                ("created_on", "created_by"),
                ("approved_on", "approved_by"),
                "rejection_reason",
            )
        }),
    )
