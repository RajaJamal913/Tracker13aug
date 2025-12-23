# shifts/models.py

from django.db import models
from django.conf import settings

# Adjust this import if your “Member” model lives somewhere else
from projects.models import Member  

SHIFT_TYPE_CHOICES = [
    ("standard", "Standard"),
    ("adjustable", "Adjustable"),
]

REPEAT_CHOICES = [
    ("none", "None"),
    ("weekly", "Weekly"),
    ("bi-weekly", "Bi-Weekly"),
]


class Shift(models.Model):
    """
    A Shift represents a scheduled block of working hours for one or more Members.
    """

    name = models.CharField(max_length=255)
    members = models.ManyToManyField(Member, related_name="shifts")
    working_days = models.CharField(
        max_length=50,
        help_text="Comma-separated days (e.g. Mon,Tue,Wed)",
    )
    timezone = models.CharField(max_length=50, default="Asia/Karachi")
    start_date = models.DateField()
    required_hours = models.PositiveIntegerField(help_text="Required hours per working day")
    shift_type = models.CharField(max_length=20, choices=SHIFT_TYPE_CHOICES, default="standard")
    start_time = models.TimeField()
    end_time = models.TimeField()
    repeat_option = models.CharField(max_length=20, choices=REPEAT_CHOICES, default="none")
    repeat_until = models.DateField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_shifts"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.start_date} → {self.end_time})"

# shifts/models.py  (append)

class ShiftNotification(models.Model):
    """
    Notification created for a Member when they're assigned to a Shift.
    """
    recipient = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="shift_notifications"
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.recipient} — {self.shift.name}"
# shifts/models.py (append)

from django.utils import timezone

ATT_STATUS_CHOICES = [
    ("ON_TIME", "On time"),
    ("LATE", "Late"),
    ("ABSENT", "Absent"),
]

class Attendance(models.Model):
    """
    Attendance record for a Member for a particular shift on a calendar date.
    - member: the Member who attended
    - shift: optional, the Shift they were assigned to
    - date: the calendar date for the shift (local to the shift's timezone)
    - login_time: the datetime when attendance was detected (UTC-aware)
    - status: ON_TIME / LATE / ABSENT
    - late_minutes: integer minutes late (0 if on-time)
    - tracked_seconds: optional seconds tracked (from WorkSession)
    """
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="attendances")
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendances")
    date = models.DateField(help_text="Calendar date for the attendance (shift local date)")
    login_time = models.DateTimeField(null=True, blank=True)  # stored as aware UTC
    status = models.CharField(max_length=16, choices=ATT_STATUS_CHOICES, default="ON_TIME")
    late_minutes = models.PositiveIntegerField(default=0)
    tracked_seconds = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("member", "shift", "date")
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"Attendance {self.member} {self.shift} {self.date} {self.status}"
