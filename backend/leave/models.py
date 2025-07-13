# leaveapp/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone

# Assume Member model already exists and includes fields: user (ForeignKey to auth.User) and team (CharField)
# If your Member model lives in another app, adjust this import accordingly.
from projects.models import Member  

class LeavePolicy(models.Model):
    """
    A predefined policy (e.g. "Leave", "Sick Leave"), 
    with a flag indicating if it's paid or unpaid.
    """
    name = models.CharField(max_length=100, unique=True)
    is_paid = models.BooleanField(default=True)
    created_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    """
    A single leave request by a Member.
    - member: who requested.
    - policy: which LeavePolicy.
    - reason: free-text.
    - start_date, end_date: date range.
    - total_days: computed (# days inclusive).
    - status: 'pending' / 'approved' / 'rejected'
    - created_on, created_by: timestamps & who created (the same member).
    - approved_on, approved_by: when and who approved/rejected.
    - rejection_reason: if rejected.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="leave_requests")
    policy = models.ForeignKey(LeavePolicy, on_delete=models.PROTECT, related_name="leave_requests")
    reason = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()

    total_days = models.PositiveSmallIntegerField(default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")

    created_on = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="created_leave_requests")

    approved_on = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_leave_requests")

    rejection_reason = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Compute total_days as inclusive
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            # +1 to count both start and end
            self.total_days = delta.days + 1 if delta.days >= 0 else 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.user.username} | {self.policy.name} ({self.start_date} to {self.end_date})"
