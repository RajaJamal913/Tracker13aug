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
