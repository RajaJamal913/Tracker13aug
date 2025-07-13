# shifts/admin.py

from django.contrib import admin
from .models import Shift

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    """Admin configuration for the Shift model."""

    # Display these columns in the list view
    list_display = (
        "name",
        "start_date",
        "show_working_days",
        "start_time",
        "end_time",
        "shift_type",
        "repeat_option",
        "created_by",
        "created_at",
    )

    # Allow filtering by these fields in the right sidebar
    list_filter = (
        "shift_type",
        "repeat_option",
        "timezone",
        "start_date",
    )

    # Allow searching by name, member usernames, and creator
    search_fields = (
        "name",
        "members__user__username",
        "created_by__username",
    )

    # Use a horizontal filter widget for the ManyToMany "members" field
    filter_horizontal = ("members",)

    # Mark these fields read-only in the detail/edit form
    readonly_fields = ("created_by", "created_at")

    # Specify the default ordering in the list view
    ordering = ("-created_at",)

    # Control which fields appear (and in what order) on the edit/create form
    fields = (
        "name",
        "members",
        "working_days",
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
    )

    def save_model(self, request, obj, form, change):
        """
        Automatically set 'created_by' to the current user on creation.
        """
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def show_working_days(self, obj):
        """
        Display working_days (stored as CSV) as a comma-separated list in list_display.
        """
        if not obj.working_days:
            return ""
        return ", ".join(obj.working_days.split(","))
    show_working_days.short_description = "Working Days"
