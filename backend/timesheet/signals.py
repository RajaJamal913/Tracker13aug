from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TimeRequest, Notification
from task_api.models import TaskAI


# --------------------------
# TimeRequest notifications
# --------------------------
@receiver(post_save, sender=TimeRequest)
def notify_project_owner(sender, instance: TimeRequest, created, **kwargs):
    """
    Notify project owner when a new TimeRequest is created.
    """
    if not created:
        return

    project = getattr(instance, 'project', None)
    owner = getattr(project, 'created_by', None)

    if owner:
        Notification.objects.create(
            recipient=owner,
            time_request=instance,
            verb=f"{instance.user} requested extra time on “{project.name}” ({instance.requested_duration})"
        )


# --------------------------
# TaskAI assignment notifications
# --------------------------
@receiver(post_save, sender=TaskAI)
def notify_task_assignee(sender, instance: TaskAI, created, **kwargs):
    """
    Notify the assignee when a new TaskAI is created and assigned.
    Only trigger if there is an assignee.
    """
    if instance.assignee is None:
        return  # no one assigned, skip

    # If new task with assignee
    if created:
        Notification.objects.create(
            recipient=instance.assignee,
            task=instance,
            verb=f"You have been assigned a new task via AI: {instance.title}"
        )
