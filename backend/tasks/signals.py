# tasks/signals.py
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Task, Member

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_member_for_new_user(sender, instance, created, **kwargs):
    """
    Every time a User is created, also create a corresponding Member.
    This guarantees Member.objects.get(user=request.user) can’t “miss.”
    """
    if created:
        Member.objects.get_or_create(user=instance)

@receiver(post_save, sender=Task)
def ensure_assignee_on_project(sender, instance: Task, created, **kwargs):
    """
    After a Task is saved (created) with an assignee (Member), auto-add
    that Member into the task’s project.members M2M.
    """
    if created and instance.assignee:
        project = instance.project
        member = instance.assignee

        # Only add if the Member actually has a .user
        if not member.user:
            return

        project.members.add(member)
        project.save()
