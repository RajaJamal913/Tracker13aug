from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)
class Member(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='member_profile',
    )
    role = models.CharField(max_length=255, blank=True)

    def __str__(self):
        if self.user_id and hasattr(self.user, 'username'):
            return f"{self.user.username} ({self.role or 'Member'})"
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

class Invitation(models.Model):
    email = models.EmailField(db_index=True)
    project = models.ForeignKey("Project", on_delete=models.CASCADE, related_name="invitations")
    token = models.CharField(max_length=128, unique=True, db_index=True)
    role = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_valid(self):
        return (not self.accepted) and (self.expires_at >= timezone.now())

    
    def mark_accepted(self):
        """
        Mark invitation as accepted, set timestamp and notify inviter.
        """
        self.accepted = True
        self.accepted_at = timezone.now()
        # Only update those two fields to minimize DB writes
        self.save(update_fields=["accepted", "accepted_at"])

        # Notify the user who created the invite (created_by) that the invite was accepted.
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