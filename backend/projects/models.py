from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)
from django.conf import settings
from django.db import models

class Member(models.Model):
    DEVELOPER_TYPE_WEB = "web"
    DEVELOPER_TYPE_MOBILE = "mobile"
    DEVELOPER_TYPE_UIUX = "uiux"
    DEVELOPER_TYPE_OTHER = "other"

    DEVELOPER_TYPE_CHOICES = [
        (DEVELOPER_TYPE_WEB, "Web Developer"),
        (DEVELOPER_TYPE_MOBILE, "Mobile Developer"),
        (DEVELOPER_TYPE_UIUX, "UI/UX Designer"),
        (DEVELOPER_TYPE_OTHER, "Other"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='member_profile',
    )
    role = models.CharField(max_length=255, blank=True)

    # NEW fields
    experience = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Years of experience (integer)."
    )
    skills = models.TextField(
        blank=True,
        default="",
        help_text="Comma separated list or free-form skills text."
    )

    developer_type = models.CharField(
        max_length=10,
        choices=DEVELOPER_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Type of developer: web, mobile, or UI/UX designer."
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        username = getattr(self.user, 'username', None)
        dev = dict(self.DEVELOPER_TYPE_CHOICES).get(self.developer_type, None)
        if username:
            extra = f" — {dev}" if dev else ""
            return f"{username} ({self.role or 'Member'}){extra}"
        return f"Member #{self.pk}"
    
class Project(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    billable = models.BooleanField(default=False)

    # make optional so invites / quick-creates don't fail
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    time_estimate = models.IntegerField(blank=True, null=True)
    budget_estimate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_projects"
    )
    members = models.ManyToManyField(Member, related_name="projects", blank=True)

    def clean(self):
        # if both dates exist, validate order; otherwise skip
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError("End date cannot be earlier than start date.")

    def __str__(self):
        return self.name

class Property(models.Model):
    project = models.ForeignKey(Project, related_name="properties", on_delete=models.CASCADE)
    key = models.CharField(max_length=255)
    value = models.TextField()
    screenshot = models.ImageField(upload_to="screenshots/", blank=True, null=True)

    def __str__(self):
        return f"{self.key}: {self.value}"


# models.py (add this to the same app where Project/Member live)
import secrets
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone

# in models.py (update Invitation model)
from django.conf import settings
from django.utils import timezone

class Invitation(models.Model):
    email = models.EmailField(db_index=True)
    project = models.ForeignKey("Project", on_delete=models.CASCADE, related_name="invitations")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    role = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    # NEW: who accepted (if a registered user accepted)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_invitations",
    )

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_valid(self):
        return (not self.accepted) and (self.expires_at >= timezone.now())

    def mark_accepted(self, accepted_by_user=None):
        """
        Prefer calling this helper to mark the invitation accepted.
        """
        self.accepted = True
        self.accepted_at = timezone.now()
        if accepted_by_user:
            self.accepted_by = accepted_by_user
        # Save the explicit fields
        self.save(update_fields=["accepted", "accepted_at", "accepted_by"])
        # Optionally notify inviter (your existing logic)
        try:
            inviter = self.created_by
            if inviter and inviter.email:
                subject = f"Invitation accepted for project {self.project.name}"
                message = (
                    f"{self.email} accepted the invitation to join project \"{self.project.name}\".\n\n"
                    f"Accepted at: {self.accepted_at.isoformat()}\n\n"
                    "Visit the project to review members."
                )
                from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
                send_mail(subject, message, from_email, [inviter.email], fail_silently=True)
        except Exception:
            logger.exception("Failed to send invitation-accepted email for invite id=%s", self.pk)

class Team(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    members = models.ManyToManyField("Member", related_name="teams", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_teams",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name