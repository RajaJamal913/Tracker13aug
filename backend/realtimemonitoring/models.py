# realtimemonitoring/models.py

from django.db import models
from django.utils import timezone

from projects.models import Member, Project

class WorkSession(models.Model):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="work_sessions"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        related_name="work_sessions"
    )
    start = models.DateTimeField(default=timezone.now)
    accumulated = models.BigIntegerField(default=0)
    is_running = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["member", "project"],
                name="unique_member_project"
            )
        ]
        # Optional: order by most recent start
        ordering = ["-start"]

    def stop(self):
        """Stop the timer and accumulate seconds since start."""
        if self.is_running:
            now = timezone.now()
            elapsed = int((now - self.start).total_seconds())
            self.accumulated += elapsed
            self.is_running = False
            self.save()

    def restart(self):
        """Restart the timer from accumulated time."""
        if not self.is_running:
            self.start = timezone.now()
            self.is_running = True
            self.save()

    @property
    def total_seconds(self):
        if self.is_running:
            return self.accumulated + int((timezone.now() - self.start).total_seconds())
        return self.accumulated

class BreakPolicy(models.Model):
    """
    A named “break policy” (Tea Break, Meal Break, etc.), 
    with a maximum number of minutes per day, a type (Paid/Unpaid),
    and a set of Member instances to whom this policy applies.
    """
    POLICY_TYPE_CHOICES = [
        ('Paid', 'Paid'),
        ('Unpaid', 'Unpaid'),
    ]

    name = models.CharField(max_length=100, unique=True)
    members = models.ManyToManyField(
        Member,
        related_name='break_policies',
        blank=True,
        help_text="Which members this break policy applies to."
    )
    apply_to_new = models.BooleanField(
        default=False,
        help_text="If True, automatically apply this policy to any newly created members."
    )
    max_minutes_per_day = models.PositiveIntegerField(
        default=0,
        help_text="Maximum minutes allowed per day (e.g. 30)."
    )
    type = models.CharField(
        max_length=10,
        choices=POLICY_TYPE_CHOICES,
        default='Unpaid'
    )
    created_at = models.DateTimeField( null=True)

    def __str__(self):
        return f"{self.name} ({self.type}, {self.max_minutes_per_day} min/day)"


class BreakSession(models.Model):
    """
    Tracks a single member’s “break in progress,” similarly to WorkSession:
    - `member` is OneToOne so that at most one current BreakSession can be running.
    - `start` is when the break was (re)started.
    - `accumulated` stores total seconds for today’s breaks (reset at midnight—user logic can handle that).
    - `is_running` tracks whether the break is currently active.
    - `policy` links back to which BreakPolicy the user selected when starting this break.
    """
    member = models.OneToOneField(
        Member,
        on_delete=models.CASCADE,
        related_name='current_break',
        null=True,
    )
    policy = models.ForeignKey(
        BreakPolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Which BreakPolicy this session is following."
    )
    start = models.DateTimeField(default=timezone.now)
    accumulated = models.BigIntegerField(default=0)  # total seconds so far for today
    is_running = models.BooleanField(default=True)

    def stop(self):
        """
        Stop the break timer, accumulate seconds since `start`.
        """
        if self.is_running:
            now = timezone.now()
            # compute elapsed for this run:
            elapsed = int((now - self.start).total_seconds())
            self.accumulated += elapsed
            self.is_running = False
            self.save()

    def restart(self):
        """
        If the break was paused, resume it (sets a new `start` timestamp).
        """
        if not self.is_running:
            self.start = timezone.now()
            self.is_running = True
            self.save()

    @property
    def total_seconds(self):
        """
        Return “accumulated + (if currently running, seconds since start)”.
        """
        if self.is_running:
            return self.accumulated + int((timezone.now() - self.start).total_seconds())
        return self.accumulated

    def __str__(self):
        return f"{self.member.user.username} - {self.policy.name if self.policy else 'NoPolicy'} - {'Running' if self.is_running else 'Paused'}"
