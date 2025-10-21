from django.contrib import admin
from .models import TaskAI




@admin.register(TaskAI)
class TaskAIAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "priority", "deadline", "hours", "created_by", "created_at")
    list_filter = ("priority", "project", "project_type")
    search_fields = ("title", "web_desc", "mobile_desc", "figma_desc")