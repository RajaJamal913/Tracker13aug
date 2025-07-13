from django.contrib import admin

# Register your models here.
# timesheet/admin.py
from django.contrib import admin
from .models import TimeEntry

@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'task', 'date', 'start_time', 'end_time')
    list_filter = ('date', 'project', 'task', 'user')
    search_fields = ('user__username', 'project__name', 'task__title', 'activity_description')
