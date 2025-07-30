from rest_framework import serializers

class TrackedHoursSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    project_name = serializers.CharField()
    total_seconds = serializers.IntegerField()
