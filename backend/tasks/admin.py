# tasks/admin.py
from django.contrib import admin
from .models import Task
from .serializers import TaskSerializer

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'project', 'sequence_id', 'title', 'assignee', 'priority', 'status', 'due_date', 'created_at'
    )
    list_filter = ('project', 'priority', 'status', 'due_date')
    search_fields = ('title', 'project__name', 'assignee__name')
    ordering = ('project', 'created_at')

    def sequence_id(self, obj):
        # Mirror serializer logic for admin display
        return Task.objects.filter(
            project=obj.project,
            created_at__lte=obj.created_at
        ).count()
    sequence_id.short_description = 'Task #'
