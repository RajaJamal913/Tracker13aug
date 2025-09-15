from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Member

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_member_for_new_user(sender, instance, created, **kwargs):
    if created:
        Member.objects.get_or_create(user=instance)
# signals.py
import logging
# projects/signals.py
import logging
from django.db import transaction
from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone

from django.conf import settings
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None

from .models import Invitation, Member

logger = logging.getLogger(__name__)

def _not_accepted(invite):
    """
    Return True if invite appears NOT accepted (defensive check against multiple field names).
    """
    for f in ("is_accepted", "accepted", "accepted_at", "accepted_on"):
        if hasattr(invite, f):
            val = getattr(invite, f)
            if isinstance(val, bool) and val:
                return False
            if val is not None and not (isinstance(val, bool) and val is False):
                # datetime or truthy -> considered accepted
                return False
    return True

def _accept_invite_for_user(invite, user):
    """
    Accept single invite for given user: create Member, attach to project, set accepted flags.
    This is idempotent and logs exceptions per-invite to be resilient.
    """
    try:
        with transaction.atomic():
            # Ensure Member record exists for this user
            member_obj, created_member = Member.objects.get_or_create(user=user, defaults={"role": getattr(invite, "role", "")})

            # Attach to project if present
            if getattr(invite, "project", None):
                invite.project.members.add(member_obj)
            else:
                logger.warning("Invitation %s has no project to attach to for user %s", getattr(invite, "pk", None), user.pk)

            changed = False
            if hasattr(invite, "accepted_by"):
                try:
                    invite.accepted_by = user
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_by on invite %s", invite.pk)
            if hasattr(invite, "accepted_at"):
                try:
                    invite.accepted_at = timezone.now()
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_at on invite %s", invite.pk)
            if hasattr(invite, "is_accepted"):
                try:
                    invite.is_accepted = True
                    changed = True
                except Exception:
                    logger.exception("Failed to set is_accepted on invite %s", invite.pk)

            # Prefer model's mark_accepted() if it has one
            try:
                if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                    invite.mark_accepted()
                elif changed:
                    invite.save()
            except Exception:
                logger.exception("Failed to mark/save invite %s", invite.pk)

            logger.info("Auto-accepted invite id=%s for user=%s", getattr(invite, "pk", None), user.pk)
    except Exception:
        logger.exception("Failed to auto-accept invite %s for user %s", getattr(invite, "pk", None), getattr(user, "pk", None))


@receiver(post_save, sender=User)
def accept_invites_on_user_save(sender, instance, created, **kwargs):
    """
    When a user is created or saved, accept any outstanding invites matching their email.
    This handles users who register using the invited email.
    """
    try:
        user = instance
        email = getattr(user, "email", None)
        if not email:
            return

        # find invites with matching email (case-insensitive)
        qs = Invitation.objects.filter(email__iexact=email)

        invites_to_accept = [inv for inv in qs if _not_accepted(inv)]
        if not invites_to_accept:
            return

        for inv in invites_to_accept:
            _accept_invite_for_user(inv, user)
    except Exception:
        logger.exception("Error running accept_invites_on_user_save signal for user %s", getattr(instance, "pk", None))


@receiver(user_logged_in)
def accept_invites_on_user_logged_in(sender, user, request, **kwargs):
    """
    When a user logs in, accept any outstanding invites matching their email.
    This covers cases where the user existed already but uses the invite link to login first.
    """
    try:
        email = getattr(user, "email", None)
        if not email:
            return

        qs = Invitation.objects.filter(email__iexact=email)
        invites_to_accept = [inv for inv in qs if _not_accepted(inv)]
        if not invites_to_accept:
            return

        for inv in invites_to_accept:
            _accept_invite_for_user(inv, user)
    except Exception:
        logger.exception("Error running accept_invites_on_user_logged_in signal for user %s", getattr(user, "pk", None))
