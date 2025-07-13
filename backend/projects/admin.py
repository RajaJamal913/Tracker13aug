from django.contrib import admin
from .models import Project

class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'billable', 'start_date', 'end_date', 'time_estimate', 'budget_estimate', 'created_at')
    list_filter = ('billable', 'start_date', 'end_date')
    search_fields = ('name', 'notes')
    ordering = ('-created_at',)

    # Ensuring clean() validation runs in the admin panel
    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)

admin.site.register(Project, ProjectAdmin)
from django.contrib import admin
from .models import Member

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "project_count")
    list_filter = ("role",)
    search_fields = ("user__username",)
    ordering = ("user__username",)

    def project_count(self, obj):
        return obj.projects.count()
    project_count.short_description = "Projects"
