from datetime import datetime, date, timedelta
from typing import List, Tuple
from zoneinfo import ZoneInfo
import logging

from django.utils import timezone
from .models import Shift, Attendance
from projects.models import Member

logger = logging.getLogger(__name__)

# Valid tokens for working_days CSV (shared constant)
DAY_CHOICES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# default grace in minutes before being considered late
DEFAULT_GRACE_MINUTES = 15


def _weekday_code(d: date) -> str:
    return d.strftime("%a")


def _tz_for_shift(shift: Shift):
    if not getattr(shift, "timezone", None):
        return timezone.get_default_timezone()
    try:
        return ZoneInfo(shift.timezone)
    except Exception:
        logger.warning("Invalid timezone '%s' for shift id=%s; using default tz", shift.timezone, shift.id)
        return timezone.get_default_timezone()


def shifts_for_member_on_date(member: Member, target_date: date) -> List[Shift]:
    weekday = _weekday_code(target_date)
    qs = Shift.objects.filter(members=member, working_days__icontains=weekday)
    result = []
    for s in qs:
        if s.start_date and target_date < s.start_date:
            continue
        if s.repeat_option != "none" and s.repeat_until and target_date > s.repeat_until:
            continue
        day_list = [d.strip() for d in (s.working_days or "").split(",") if d.strip()]
        if weekday not in day_list:
            continue
        result.append(s)
    return result


def _ensure_aware(dt: datetime) -> datetime:
    if dt is None:
        return timezone.now()
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


def create_or_update_attendance_for(
    member: Member,
    detected_dt: datetime = None,
    tracked_seconds: int = None,
    grace_minutes: int = DEFAULT_GRACE_MINUTES,
) -> Tuple[List[Attendance], List[str]]:
    """
    Create or update Attendance rows for a member based on a single check-in moment.

    Rules:
      - `detected_dt` is normalized to an aware datetime (server default tz if naive).
      - Status is computed only when creating the attendance or when a strictly earlier login_time is recorded.
      - When only tracked_seconds changes, status is NOT recomputed.
    """
    warnings = []
    detected_dt = _ensure_aware(detected_dt)
    now_utc = detected_dt.astimezone(timezone.utc)

    created_or_updated = []

    candidate_shifts = Shift.objects.filter(members=member)

    for s in candidate_shifts:
        tz = _tz_for_shift(s)
        localized_now = detected_dt.astimezone(tz)
        target_date = localized_now.date()

        day_token = target_date.strftime("%a")
        day_list = [d.strip() for d in (s.working_days or "").split(",") if d.strip()]
        if day_token not in day_list:
            prev_local_date = (localized_now - timedelta(days=1)).date()
            if prev_local_date.strftime("%a") in day_list:
                target_date = prev_local_date
                day_token = prev_local_date.strftime("%a")
            else:
                continue

        if s.start_date and target_date < s.start_date:
            continue
        if s.repeat_option != "none" and s.repeat_until and target_date > s.repeat_until:
            continue

        if s.start_time is None or s.end_time is None:
            warnings.append(f"Shift {s.id} missing start_time or end_time")
            logger.warning("Shift %s missing times", s.id)
            continue

        shift_start_naive = datetime.combine(target_date, s.start_time)
        try:
            shift_start_local = timezone.make_aware(shift_start_naive, tz)
        except Exception:
            shift_start_local = shift_start_naive.replace(tzinfo=tz)

        shift_end_naive = datetime.combine(target_date, s.end_time)
        if s.end_time <= s.start_time:
            shift_end_naive = shift_end_naive + timedelta(days=1)
        try:
            shift_end_local = timezone.make_aware(shift_end_naive, tz)
        except Exception:
            shift_end_local = shift_end_naive.replace(tzinfo=tz)

        arrive_dt_local = detected_dt.astimezone(tz)
        diff_minutes = int((arrive_dt_local - shift_start_local).total_seconds() / 60)

        if diff_minutes <= grace_minutes:
            computed_status = "ON_TIME"
            computed_late_minutes = 0
        else:
            computed_status = "LATE"
            computed_late_minutes = max(0, diff_minutes)

        login_time_utc = now_utc

        attendance, created = Attendance.objects.get_or_create(
            member=member,
            shift=s,
            date=target_date,
            defaults={
                "login_time": login_time_utc,
                "status": computed_status,
                "late_minutes": computed_late_minutes,
                "tracked_seconds": tracked_seconds,
            },
        )

        if created:
            logger.info(
                "Created attendance: member=%s shift=%s date=%s status=%s login=%s",
                member.id, s.id, target_date, attendance.status, attendance.login_time,
            )
        else:
            updated = False
            if attendance.login_time is None or login_time_utc < attendance.login_time:
                old_login = attendance.login_time
                old_status = attendance.status
                attendance.login_time = login_time_utc
                attendance.status = computed_status
                attendance.late_minutes = computed_late_minutes
                updated = True
                logger.info(
                    "Updated attendance login (earlier): member=%s shift=%s date=%s old_login=%s new_login=%s old_status=%s new_status=%s",
                    member.id, s.id, target_date, old_login, attendance.login_time, old_status, attendance.status,
                )

            if tracked_seconds is not None:
                if attendance.tracked_seconds is None or tracked_seconds > attendance.tracked_seconds:
                    attendance.tracked_seconds = tracked_seconds
                    updated = True
                    logger.info(
                        "Updated attendance tracked_seconds: member=%s shift=%s date=%s tracked_seconds=%s",
                        member.id, s.id, target_date, attendance.tracked_seconds,
                    )

            if updated:
                attendance.save()

        created_or_updated.append(attendance)

    return created_or_updated, warnings
