
# timesheet/serializers.py
from rest_framework import serializers
from .models import TimeEntry

class TimeEntrySerializer(serializers.ModelSerializer):
    project = serializers.CharField(source="project.name", read_only=True)
    task = serializers.CharField(source="task.title", read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=TimeEntry._meta.get_field('project').related_model.objects.all(),
        source="project", write_only=True
    )
    task_id = serializers.PrimaryKeyRelatedField(
        queryset=TimeEntry._meta.get_field('task').related_model.objects.all(),
        source="task", write_only=True
    )

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'user', 'project', 'task', 'project_id', 'task_id',
            'date', 'start_time', 'end_time', 'activity_description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'project', 'task', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and not request.user.is_anonymous else None
        validated_data['user'] = user
        return super().create(validated_data)
    
