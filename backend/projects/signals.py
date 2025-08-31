from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Member

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_member_for_new_user(sender, instance, created, **kwargs):
    if created:
        Member.objects.get_or_create(user=instance)

# projects/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Invitation, Member

User = get_user_model()

@receiver(post_save, sender=User)
def accept_pending_invites_for_new_user(sender, instance, created, **kwargs):
    """
    When a user is created (signup), find pending invites for their email,
    add them to the project as Member, and mark the invite accepted.
    """
    if not created:
        return

    now = timezone.now()
    invites = Invitation.objects.filter(email__iexact=instance.email, accepted=False, expires_at__gte=now)
    for inv in invites:
        member_obj, _ = Member.objects.get_or_create(user=instance, defaults={"role": inv.role})
        inv.project.members.add(member_obj)
        try:
            inv.mark_accepted()
        except Exception:
            # if mark_accepted raises, still continue and log
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error marking invite %s accepted for user %s", inv.pk, instance.pk)
