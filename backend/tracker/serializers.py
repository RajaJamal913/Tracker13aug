# tracker/serializers.py
from rest_framework import serializers
from realtimemonitoring.models import WorkSession   # <— import the one you already wrote

class WorkSessionSerializer(serializers.ModelSerializer):
    member        = serializers.StringRelatedField()  # uses Member.__str__()
    project       = serializers.StringRelatedField()  # uses Project.__str__()
    total_seconds = serializers.IntegerField(read_only=True)

    class Meta:
        model  = WorkSession
        fields = [
            'id',
            'member',
            'project',
            'start',
            'accumulated',
            'is_running',
            'total_seconds',
        ]
        read_only_fields = ['accumulated', 'total_seconds']
