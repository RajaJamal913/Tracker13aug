# tasks/models.py
from django.db import models
from projects.models import Project,Member


class Task(models.Model):
    project = models.ForeignKey(
        Project,
        related_name='tasks',
        on_delete=models.CASCADE
    )
    assignee = models.ForeignKey(
        Member,
        related_name='tasks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    # NEW: who assigned/created this task (a Member)
    assigned_by = models.ForeignKey(
        Member,
        related_name='assigned_tasks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Member who assigned this task"
    )

    title = models.CharField(max_length=255)
    due_date = models.DateField(null=True, blank=True)

    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Normal', 'Normal'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='Normal'
    )

    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
        ('CLOSED', 'Closed'),
    ]
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default='OPEN'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project', 'created_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"