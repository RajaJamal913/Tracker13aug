# models.py (updated TaskAI model)
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class TaskAI(models.Model):
    """
    Task model used with AI-driven assignment.

    Key additions:
    - assignment_locked: explicit boolean to prevent casual reassignment of AI-assigned tasks.
    - ai_confidence: validated 0-100.
    """
    PROJECT_TYPE_WEB = "Web"
    PROJECT_TYPE_MOBILE = "Mobile"
    PROJECT_TYPE_BOTH = "Both"

    PROJECT_TYPE_CHOICES = [
        (PROJECT_TYPE_WEB, "Web"),
        (PROJECT_TYPE_MOBILE, "Mobile"),
        (PROJECT_TYPE_BOTH, "Both"),
    ]

    PRIORITY_HIGH = "High"
    PRIORITY_MEDIUM = "Medium"
    PRIORITY_LOW = "Low"
    PRIORITY_CHOICES = [
        (PRIORITY_HIGH, "High"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_LOW, "Low"),
    ]

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="taskai_tasks",
    )

    title = models.CharField(max_length=255)
    project_type = models.CharField(max_length=10, choices=PROJECT_TYPE_CHOICES, null=True, blank=True)

    web_desc = models.TextField(blank=True, null=True)
    mobile_desc = models.TextField(blank=True, null=True)
    figma_desc = models.TextField(blank=True, null=True)

    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    deadline = models.DateField(null=True, blank=True)
    hours = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_taskai"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    extra = models.JSONField(default=dict, blank=True)

    # --- Assignment & AI metadata fields ---
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_taskai"
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="made_taskai_assignments"
    )
    assigned_at = models.DateTimeField(null=True, blank=True)

    # AI metadata
    ai_suggested = models.BooleanField(default=False)
    ai_confidence = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Confidence from AI selection (0-100)"
    )
    ai_reason = models.TextField(blank=True, null=True)
    ai_meta = models.JSONField(default=dict, blank=True)

    # Explicit assignment lock: prevents casual reassignment when True.
    assignment_locked = models.BooleanField(
        default=False,
        db_index=True,
        help_text="When True the task should not be reassigned by non-staff (set by AI auto-assign)."
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Task AI"
        verbose_name_plural = "Tasks AI"

    def __str__(self):
        return f"{self.title} ({self.pk})"

    # convenience helpers
    def lock_assignment(self, save: bool = True):
        """Mark assignment as locked (use after AI auto-assign)."""
        self.assignment_locked = True
        if save:
            self.save(update_fields=["assignment_locked"])

    def unlock_assignment(self, save: bool = True):
        """Clear assignment lock (use when staff overrides)."""
        self.assignment_locked = False
        if save:
            self.save(update_fields=["assignment_locked"])

# models.py (append)

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Avg

# (Assumes TaskAI and Member are already defined above in the file or imported)

class TaskReview(models.Model):
    """
    A review left for a TaskAI. Linked to the reviewer (Member) and the reviewed task.
    """
    task = models.ForeignKey("task_api.TaskAI", on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey("projects.Member", on_delete=models.SET_NULL, null=True, blank=True, related_name="task_reviews")
    text = models.TextField(blank=True, default="")
    # rating is optional but constrained 1..5
    rating = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Task Review"
        verbose_name_plural = "Task Reviews"

    def __str__(self):
        return f"Review for Task#{self.task_id} by Member#{getattr(self.reviewer,'pk', 'anon')}"

