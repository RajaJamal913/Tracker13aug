# signals.py
import logging
from django.db import transaction
from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None

from .models import Invitation, Member

def _not_accepted(invite: Invitation) -> bool:
    """
    Return True if invite appears NOT accepted (defensive check against multiple field names).
    """
    for f in ("is_accepted", "accepted", "accepted_at", "accepted_on"):
        if hasattr(invite, f):
            val = getattr(invite, f)
            if isinstance(val, bool) and val:
                return False
            if val is not None and not (isinstance(val, bool) and val is False):
                return False
    return True


def _accept_invite_for_user(invite: Invitation, user):
    """
    Accept single invite for given user: create Member, attach to project, set accepted flags.
    Idempotent and logs exceptions.
    """
    try:
        with transaction.atomic():
            member_obj, _ = Member.objects.get_or_create(user=user, defaults={"role": getattr(invite, "role", "")})

            if getattr(invite, "project", None):
                invite.project.members.add(member_obj)
            else:
                logger.warning("Invitation %s has no project to attach to for user %s", getattr(invite, "pk", None), getattr(user, "pk", None))

            changed = False
            if hasattr(invite, "accepted_by"):
                try:
                    invite.accepted_by = user
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_by on invite %s", getattr(invite, "pk", None))
            if hasattr(invite, "accepted_at"):
                try:
                    invite.accepted_at = timezone.now()
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_at on invite %s", getattr(invite, "pk", None))
            if hasattr(invite, "accepted"):
                try:
                    invite.accepted = True
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted on invite %s", getattr(invite, "pk", None))

            # prefer model helper
            try:
                if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                    invite.mark_accepted(user=user)
                elif changed:
                    invite.save()
            except Exception:
                logger.exception("Failed to mark/save invite %s", getattr(invite, "pk", None))

            logger.info("Auto-accepted invite id=%s for user=%s", getattr(invite, "pk", None), getattr(user, "pk", None))
    except Exception:
        logger.exception("Failed to auto-accept invite %s for user %s", getattr(invite, "pk", None), getattr(user, "pk", None))


@receiver(post_save, sender=User)
def accept_invites_on_user_save(sender, instance, created, **kwargs):
    """
    When a user is created (or saved), accept any outstanding invites matching their email.
    """
    try:
        user = instance
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
        logger.exception("Error running accept_invites_on_user_save signal for user %s", getattr(instance, "pk", None))


@receiver(user_logged_in)
def accept_invites_on_user_logged_in(sender, user, request, **kwargs):
    """
    When a user logs in, accept any outstanding invites matching their email.
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
