from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError

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
    name = models.CharField(max_length=255, db_index=True)  # Indexed for faster lookup
    billable = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField()
    time_estimate = models.IntegerField(blank=True, null=True)  # Changed to IntegerField for better calculations
    budget_estimate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Default value set
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_projects"
    )
        # <-- change here
    members = models.ManyToManyField(Member, related_name="projects", blank=True)


    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError("End date cannot be earlier than start date.")

    def _str_(self):
        return self.name 

class Property(models.Model):
    project = models.ForeignKey(Project, related_name="properties", on_delete=models.CASCADE)
    key = models.CharField(max_length=255)
    value = models.TextField()
    screenshot = models.ImageField(upload_to="screenshots/", blank=True, null=True)

    def __str__(self):
        return f"{self.key}: {self.value}"

