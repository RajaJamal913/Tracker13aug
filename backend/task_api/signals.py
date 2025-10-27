# signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import TaskReview, Member
from django.db.models import Avg, Count

@receiver([post_save, post_delete], sender=TaskReview)
def update_member_review_aggregates(sender, instance, **kwargs):
    task = instance.task
    reviewed_member = None
    if getattr(task, "assignee", None):
        try:
            reviewed_member = Member.objects.get(user=task.assignee)
        except Member.DoesNotExist:
            reviewed_member = None

    if not reviewed_member:
        return

    agg = TaskReview.objects.filter(task__assignee=reviewed_member.user, rating__isnull=False).aggregate(avg=Avg("rating"), cnt=Count("id"))
    avg_rating = agg["avg"] or 0.0
    cnt = agg["cnt"] or 0

    if hasattr(reviewed_member, "avg_rating"):
        reviewed_member.avg_rating = float(avg_rating)
    if hasattr(reviewed_member, "review_count"):
        reviewed_member.review_count = int(cnt)
    if hasattr(reviewed_member, "last_reviewed_at"):
        # set to latest review's created_at if present
        latest = TaskReview.objects.filter(task__assignee=reviewed_member.user).order_by("-created_at").first()
        reviewed_member.last_reviewed_at = latest.created_at if latest else None

    reviewed_member.save(update_fields=[f for f in ("avg_rating", "review_count", "last_reviewed_at") if hasattr(reviewed_member, f)])
