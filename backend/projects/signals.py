# signals.py
import logging
from django.db import transaction
from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)
from .utils import accept_invite_for_user


# then inside accept_invites_on_user_save and accept_invites_on_user_logged_in
# replace call to _accept_invite_for_user(inv, user) with:

try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except Exception:
    User = None

from .models import Invitation, Member

# Config flags (defaults)
AUTO_ACCEPT_ON_USER_CREATION = getattr(settings, "INVITES_AUTO_ACCEPT_ON_USER_CREATION", False)
AUTO_ACCEPT_ON_LOGIN = getattr(settings, "INVITES_AUTO_ACCEPT_ON_LOGIN", False)


def _not_accepted(invite: Invitation) -> bool:
    """
    Return True if invite appears NOT accepted (defensive check against multiple field names).
    """
    for f in ("is_accepted", "accepted", "accepted_at", "accepted_on"):
        if hasattr(invite, f):
            val = getattr(invite, f)
            # boolean True => accepted
            if isinstance(val, bool) and val:
                return False
            # any non-None timestamp or non-false boolean => accepted
            if val is not None and not (isinstance(val, bool) and val is False):
                return False
    return True


def _accept_invite_for_user(invite: Invitation, user):
    """
    Accept single invite for given user: create Member, attach to project, set accepted flags.
    Idempotent and logs exceptions.
    Use this only when the user *intentionally* accepts the invite (via token / explicit flow).
    """
    try:
        with transaction.atomic():
            member_obj, _ = Member.objects.get_or_create(user=user, defaults={"role": getattr(invite, "role", "")})

            # Attach to project if present
            if getattr(invite, "project", None):
                try:
                    invite.project.members.add(member_obj)
                except Exception:
                    # defensive: maybe project's members is set up differently
                    logger.exception("Failed to add member to project for invite %s user %s", getattr(invite, "pk", None), getattr(user, "pk", None))

            changed = False
            # set accepted_by if present
            if hasattr(invite, "accepted_by"):
                try:
                    invite.accepted_by = user
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_by on invite %s", getattr(invite, "pk", None))

            # set accepted_at if present
            if hasattr(invite, "accepted_at"):
                try:
                    invite.accepted_at = timezone.now()
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_at on invite %s", getattr(invite, "pk", None))

            # set boolean flags if present
            for fld in ("accepted", "is_accepted"):
                if hasattr(invite, fld):
                    try:
                        setattr(invite, fld, True)
                        changed = True
                    except Exception:
                        logger.exception("Failed to set %s on invite %s", fld, getattr(invite, "pk", None))

            # Prefer model helper if available
            try:
                if hasattr(invite, "mark_accepted") and callable(invite.mark_accepted):
                    # call helper if exists - don't assume signature
                    try:
                        invite.mark_accepted(accepted_by_user=user)
                    except TypeError:
                        invite.mark_accepted()
                        # attempt to set accepted_by if the helper didn't set it
                        if hasattr(invite, "accepted_by") and invite.accepted_by is None:
                            try:
                                invite.accepted_by = user
                                invite.save(update_fields=["accepted_by"])
                            except Exception:
                                logger.exception("Failed to save accepted_by after mark_accepted for invite %s", getattr(invite, "pk", None))
                elif changed:
                    invite.save()
            except Exception:
                logger.exception("Failed to mark/save invite %s", getattr(invite, "pk", None))

            logger.info("Invite auto-accepted id=%s for user=%s", getattr(invite, "pk", None), getattr(user, "pk", None))
    except Exception:
        logger.exception("Failed to accept invite %s for user %s", getattr(invite, "pk", None), getattr(user, "pk", None))


@receiver(post_save, sender=User)
def accept_invites_on_user_save(sender, instance, created, **kwargs):
    """
    Previously this accepted invites for any user save — that caused invites to be accepted
    without the user explicitly using the invite token.

    New behaviour:
      - Only auto-accept invites on *user creation* if INVITES_AUTO_ACCEPT_ON_USER_CREATION = True.
      - Otherwise do nothing here and require explicit / token-based acceptance via AcceptInvitationView.
    """
    try:
        user = instance
        if not created:
            # avoid auto-accept on updates to existing users (was causing accidental acceptances)
            return

        if not AUTO_ACCEPT_ON_USER_CREATION:
            # auto-accept on user creation disabled by default for safety
            logger.debug("INVITES_AUTO_ACCEPT_ON_USER_CREATION disabled; skipping auto-accept for user %s", getattr(user, "pk", None))
            return

        email = getattr(user, "email", None)
        if not email:
            return

        qs = Invitation.objects.filter(email__iexact=email)
        invites_to_accept = [inv for inv in qs if _not_accepted(inv)]
        if not invites_to_accept:
            logger.debug("No outstanding invites for new user %s", getattr(user, "pk", None))
            return

        for inv in invites_to_accept:
            _accept_invite_for_user(inv, user)
    except Exception:
        logger.exception("Error running accept_invites_on_user_save signal for user %s", getattr(instance, "pk", None))


# Optional: accept on login only if setting is enabled.
# Note: enabling this will accept all outstanding invites for that user's email on login.
if AUTO_ACCEPT_ON_LOGIN:
    @receiver(user_logged_in)
    def accept_invites_on_user_logged_in(sender, user, request, **kwargs):
        """
        When a user logs in, accept any outstanding invites matching their email, if enabled by setting.
        This is disabled by default for safety — prefer token-based explicit acceptance.
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
