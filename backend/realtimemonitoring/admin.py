# realtimemonitoring/admin.py

from django.contrib import admin
from django.utils import timezone
import datetime

from .models import WorkSession

@admin.register(WorkSession)
class WorkSessionAdmin(admin.ModelAdmin):
    list_display = (
        "member",
        "is_running",
        "start",
        "accumulated_display",
        "total_display",
    )
    list_filter = ("is_running",)
    search_fields = ("member__name",)
    ordering = ("-start",)

    def accumulated_display(self, obj):
        # raw accumulated seconds in DB
        return str(datetime.timedelta(seconds=obj.accumulated))
    accumulated_display.short_description = "Accumulated"

    def total_display(self, obj):
        # live total including running time
        return str(datetime.timedelta(seconds=obj.total_seconds))
    total_display.short_description = "Total"
