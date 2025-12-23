# shifts/signals.py

from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.utils import timezone
from .utils import create_or_update_attendance_for
from projects.models import Member
from realtimemonitoring.models import WorkSession  # adjust import if different

@receiver(user_logged_in)
def mark_attendance_on_login(sender, user, request, **kwargs):
    """
    Try to mark attendance when a user logs in.
    This is best-effort — if you're using token auth, user_logged_in may not fire.
    """
    try:
        member = Member.objects.get(user=user)
    except Member.DoesNotExist:
        return

    # use request time if available; else timezone.now()
    detected_dt = timezone.now()
    create_or_update_attendance_for(member, detected_dt=detected_dt)

@receiver(post_save, sender=WorkSession)
def mark_attendance_on_worksession(sender, instance, created, **kwargs):
    """
    When a WorkSession is started (created) or resumed, ensure attendance exists.
    Assumes WorkSession has `member`, `start`, `accumulated`, `is_running` fields.
    """
    try:
        member = instance.member
    except Exception:
        return

    # only mark when a new session is created or when it is currently running
    if created or getattr(instance, "is_running", False):
        detected_dt = instance.start if getattr(instance, "start", None) else timezone.now()
        tracked = getattr(instance, "accumulated", None) or 0
        create_or_update_attendance_for(member, detected_dt=detected_dt, tracked_seconds=int(tracked))
