# timesheet/models.py

from django.db import models
from django.conf import settings
from datetime import datetime, date, timedelta

from projects.models import Project    # adjust import path as needed
from tasks.models import Task          # adjust import path as needed


class TimeRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING',  'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_requests'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='time_requests'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='time_requests'
    )
    date = models.DateField()
    time_from = models.TimeField()
    time_to   = models.TimeField()
    requested_duration = models.DurationField(editable=False)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # calculate the duration even if time_to < time_from (spans midnight)
        dt_from = datetime.combine(date.min, self.time_from)
        dt_to   = datetime.combine(date.min, self.time_to)
        delta   = dt_to - dt_from
        if delta.total_seconds() < 0:
            delta += timedelta(days=1)
        self.requested_duration = delta
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} → {self.project.name} ({self.status})"


class Notification(models.Model):
    """
    A simple notification for project owners when
    a new TimeRequest is created.
    """
    recipient   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    time_request = models.ForeignKey(
        TimeRequest,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    verb        = models.CharField(
        max_length=255,
        help_text='What happened (e.g. "requested extra time")'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    is_read     = models.BooleanField(default=False)

    def __str__(self):
        return f"[{'✔' if self.is_read else '•'}] {self.recipient}: {self.verb}"
