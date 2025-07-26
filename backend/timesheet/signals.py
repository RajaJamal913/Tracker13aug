# timesheet/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from .models import TimeRequest, Notification
from projects.models import Project  # adjust if your app label is different

@receiver(post_save, sender=TimeRequest)
def notify_project_owner(sender, instance: TimeRequest, created, **kwargs):
    """
    When a new TimeRequest is created, send a Notification to the
    Project.created_by user so they can Approve or Reject it.
    """
    if not created:
        return

    project = instance.project
    owner = getattr(project, 'created_by', None)
    if not owner:
        return

    # Create one notification per new request
    Notification.objects.create(
        recipient=owner,
        time_request=instance,
        verb=(
            f"{instance.user} requested extra time "
            f"on “{project.name}” ({instance.requested_duration})"
        )
    )
