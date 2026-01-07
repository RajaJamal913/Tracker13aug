# shifts/utils.py

from datetime import datetime, date, timedelta, timezone as dt_timezone
from typing import List, Tuple
from zoneinfo import ZoneInfo
import logging

from django.utils import timezone
from django.db import transaction

from .models import Shift, Attendance
from projects.models import Member

logger = logging.getLogger(__name__)

DAY_CHOICES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DEFAULT_GRACE_MINUTES = 15


# Helper: attempt to discover canonical status values from the model, fallback to strings.
def _resolve_status_tokens():
    """
    Return a dict with keys ON_TIME, LATE, PENDING, ABSENT mapped to the model's values
    or fallback string tokens if the model does not expose constants.
    """
    # default fallbacks
    defaults = {
        "ON_TIME": "ON_TIME",
        "LATE": "LATE",
        "PENDING": "PENDING",
        "ABSENT": "ABSENT",
    }

    try:
        # Try to read the status field choices from the model (if defined)
        status_field = Attendance._meta.get_field("status")
        choices = getattr(status_field, "choices", None)
        if choices:
            # choices is iterable of (value, label)
            # Build a set of value strings for quick membership check
            values = [str(c[0]) for c in choices]
            # Heuristic: pick likely tokens from choices if present
            mapping = {
                "ON_TIME": None,
                "LATE": None,
                "PENDING": None,
                "ABSENT": None,
            }
            for v in values:
                key = v.upper().replace("-", "_").replace(" ", "_")
                if "ON" in key and "TIME" in key:
                    mapping["ON_TIME"] = v
                elif "LATE" == key or "LATE" in key:
                    if mapping["LATE"] is None:
                        mapping["LATE"] = v
                elif "PENDING" in key:
                    mapping["PENDING"] = v
                elif "ABSENT" in key:
                    mapping["ABSENT"] = v

            # Fill any missing with heuristics (try exact names)
            for k in mapping:
                if mapping[k] is None:
                    if k in values:
                        mapping[k] = k
                    else:
                        # fallback to default string
                        mapping[k] = defaults[k]

            return mapping
    except Exception:
        # If anything goes wrong, fall back to constants
        logger.debug("Could not read Attendance.status choices; using fallback status tokens.")

    return defaults


STATUS = _resolve_status_tokens()
ON_TIME = STATUS["ON_TIME"]
LATE = STATUS["LATE"]
PENDING = STATUS["PENDING"]
ABSENT = STATUS["ABSENT"]


def create_or_update_attendance_for(
    member: Member,
    detected_dt: datetime = None,
    tracked_seconds: int = None,
    grace_minutes: int = DEFAULT_GRACE_MINUTES,
) -> Tuple[List[Attendance], List[str]]:
    """
    Create/update attendance ONLY for the given Member.
    No user/email guessing. No creator bleed-over.
    """

    warnings: List[str] = []
    now = detected_dt or timezone.now()
    created_or_updated: List[Attendance] = []

    logger.info("=== ATTENDANCE START ===")
    logger.info(
        "Member ID=%s | Username=%s",
        member.id,
        member.user.username,
    )

    # STRICT: only shifts where THIS member is assigned
    # NOTE: remove is_active filter if model doesn't have that field
    shifts = Shift.objects.filter(members=member)

    logger.info(
        "Shifts for member %s: %s",
        member.user.username,
        list(shifts.values_list("id", "name")),
    )

    if not shifts.exists():
        logger.debug("No shifts found for member %s", member.user.username)

    for shift in shifts:
        try:
            tz = ZoneInfo(shift.timezone) if shift.timezone else timezone.get_default_timezone()
        except Exception:
            tz = timezone.get_default_timezone()

        localized_now = timezone.localtime(now, tz)
        target_date = localized_now.date()
        weekday = target_date.strftime("%a")

        working_days = [d.strip() for d in (shift.working_days or "").split(",") if d.strip()]
        if weekday not in working_days:
            logger.debug(
                "Skipping shift %s – weekday %s not in %s",
                shift.id,
                weekday,
                working_days,
            )
            continue

        # Date bounds
        if shift.start_date and target_date < shift.start_date:
            continue
        if shift.repeat_option != "none" and shift.repeat_until and target_date > shift.repeat_until:
            continue

        shift_start = datetime.combine(target_date, shift.start_time).replace(tzinfo=tz)
        shift_end = datetime.combine(target_date, shift.end_time).replace(tzinfo=tz)
        if shift.end_time <= shift.start_time:
            shift_end += timedelta(days=1)

        arrive_dt = localized_now
        diff_minutes = int((arrive_dt - shift_start).total_seconds() // 60)

        # Use resolved tokens instead of Attendance.Status.*
        if diff_minutes <= grace_minutes:
            status = ON_TIME
            late_minutes = 0
        else:
            status = LATE
            late_minutes = diff_minutes

        login_time_utc = now.astimezone(dt_timezone.utc)

        logger.info(
            "Shift %s | arrive=%s | start=%s | status=%s",
            shift.id,
            arrive_dt,
            shift_start,
            status,
        )

        with transaction.atomic():
            attendance, created = Attendance.objects.select_for_update().get_or_create(
                member=member,
                shift=shift,
                date=target_date,
                defaults={
                    "login_time": login_time_utc,
                    "status": status,
                    "late_minutes": late_minutes,
                    "tracked_seconds": tracked_seconds,
                },
            )

            if created:
                logger.info(
                    "Attendance CREATED | member=%s shift=%s status=%s",
                    member.user.username,
                    shift.id,
                    status,
                )
            else:
                updated = False

                # Compare against resolved tokens
                if attendance.status in [
                    PENDING,
                    ABSENT,
                ]:
                    attendance.login_time = attendance.login_time or login_time_utc
                    attendance.status = status
                    attendance.late_minutes = late_minutes
                    updated = True

                if tracked_seconds is not None:
                    if attendance.tracked_seconds is None or tracked_seconds > attendance.tracked_seconds:
                        attendance.tracked_seconds = tracked_seconds
                        updated = True

                if updated:
                    attendance.save()
                    logger.info(
                        "Attendance UPDATED | member=%s shift=%s status=%s",
                        member.user.username,
                        shift.id,
                        attendance.status,
                    )

            created_or_updated.append(attendance)

    logger.info("=== ATTENDANCE END ===")
    return created_or_updated, warnings
