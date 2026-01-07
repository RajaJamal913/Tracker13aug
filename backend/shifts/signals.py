# shifts/signals.py

from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone
from django.db.models.signals import post_save

from projects.models import Member
from realtimemonitoring.models import WorkSession

from .utils import create_or_update_attendance_for


@receiver(user_logged_in)
def mark_attendance_on_login(sender, request, user, **kwargs):
    """
    Attendance MUST be created ONLY on real user login.
    This is the PRIMARY and preferred mechanism.
    """
    try:
        member = Member.objects.get(user=user)
    except Member.DoesNotExist:
        return

    detected_dt = timezone.now()

    # 🔒 LOGIN ONLY
    create_or_update_attendance_for(
        member=member,
        detected_dt=detected_dt,
        source="login",
    )


@receiver(post_save, sender=WorkSession)
def mark_attendance_on_worksession(sender, instance, created, **kwargs):
    """
    WorkSession MUST NOT create attendance.
    It can ONLY enrich an EXISTING attendance with tracked time.

    This prevents:
    - auto ON_TIME
    - auto LATE
    - phantom attendance
    """

    member = getattr(instance, "member", None)
    if not member:
        return

    # Attendance MUST already exist (created via login)
    attendance_qs = (
        member.attendance_set
        .filter(
            date=timezone.now().date(),
        )
        .select_related("shift")
    )

    if not attendance_qs.exists():
        return  # 🚫 no login → no attendance

    tracked_seconds = int(getattr(instance, "accumulated", 0) or 0)

    # update tracked_seconds ONLY (safe)
    for attendance in attendance_qs:
        if (
            attendance.tracked_seconds is None
            or tracked_seconds > attendance.tracked_seconds
        ):
            attendance.tracked_seconds = tracked_seconds
            attendance.save(update_fields=["tracked_seconds"])
