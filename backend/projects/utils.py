# utils.py
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Member

logger = logging.getLogger(__name__)

def accept_invite_for_user(invitation, user):
    """
    Centralized, idempotent helper to accept a single Invitation for the given user.
    - creates Member if missing
    - attaches member to invitation.project if present
    - sets accepted_by / accepted_at / boolean flags and calls mark_accepted() if available
    Returns the Member instance or None on failure.
    """
    try:
        with transaction.atomic():
            member_obj, _ = Member.objects.get_or_create(
                user=user,
                defaults={"role": getattr(invitation, "role", "")},
            )

            if getattr(invitation, "project", None):
                try:
                    invitation.project.members.add(member_obj)
                except Exception:
                    logger.exception(
                        "Failed to add member to project for invite %s user %s",
                        getattr(invitation, "pk", None),
                        getattr(user, "pk", None),
                    )

            changed = False
            # accepted_by
            if hasattr(invitation, "accepted_by") and invitation.accepted_by is None:
                try:
                    invitation.accepted_by = user
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_by on invite %s", getattr(invitation, "pk", None))

            # accepted_at
            if hasattr(invitation, "accepted_at") and invitation.accepted_at is None:
                try:
                    invitation.accepted_at = timezone.now()
                    changed = True
                except Exception:
                    logger.exception("Failed to set accepted_at on invite %s", getattr(invitation, "pk", None))

            # boolean flags
            for fld in ("accepted", "is_accepted"):
                if hasattr(invitation, fld) and not getattr(invitation, fld):
                    try:
                        setattr(invitation, fld, True)
                        changed = True
                    except Exception:
                        logger.exception("Failed to set %s on invite %s", fld, getattr(invitation, "pk", None))

            # prefer model helper if present
            try:
                if hasattr(invitation, "mark_accepted") and callable(invitation.mark_accepted):
                    try:
                        invitation.mark_accepted(accepted_by_user=user)
                    except TypeError:
                        try:
                            invitation.mark_accepted(accepted_by=user)
                        except TypeError:
                            try:
                                invitation.mark_accepted()
                            except Exception:
                                logger.exception("mark_accepted() raised for invite %s", getattr(invitation, "pk", None))
                elif changed:
                    invitation.save()
            except Exception:
                logger.exception("mark_accepted/save failed for invite %s", getattr(invitation, "pk", None))

            logger.info("Invite accepted id=%s for user=%s", getattr(invitation, "pk", None), getattr(user, "pk", None))
            return member_obj
    except Exception:
        logger.exception("Error accepting invite id=%s for user=%s", getattr(invitation, "pk", None), getattr(user, "pk", None))
        return None
    
def build_invite_url(token: str) -> str:
    """
    Build the frontend invite URL.

    - FRONTEND_BASE_URL: base URL, default http://localhost:3000
    - INVITE_PATH: path on frontend that accepts invite (default: /UserSignup)
    - INVITE_QUERY_PARAM: query parameter name (default: invite)
    """
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    invite_path = getattr(settings, "INVITE_PATH", "/UserSignup")
    param_name = getattr(settings, "INVITE_QUERY_PARAM", "invite")

    # ensure invite_path starts with a slash
    if not invite_path.startswith("/"):
        invite_path = f"/{invite_path}"

    return f"{frontend_base}{invite_path}?{param_name}={token}"


def send_invite_email_plain(invitation) -> None:
    """
    Send a plain-text invite email for the given invitation object.

    Defensive: handles missing project/created_by/expires_at fields gracefully.
    This is best-effort — exceptions from the mail backend are logged but do not
    raise to callers (to avoid breaking invite creation flows).
    """
    try:
        invite_url = build_invite_url(getattr(invitation, "token", ""))
        inviter_name = None
        try:
            created_by = getattr(invitation, "created_by", None)
            if created_by:
                inviter_name = created_by.get_full_name() or getattr(created_by, "username", None)
        except Exception:
            inviter_name = None

        inviter_name = inviter_name or "Someone"
        project = getattr(invitation, "project", None)
        project_name = getattr(project, "name", None) if project else "the project"

        expires_at = getattr(invitation, "expires_at", None)
        try:
            # prefer ISO with timezone if available
            if expires_at is not None:
                if hasattr(expires_at, "astimezone"):
                    expires_str = expires_at.astimezone(timezone.get_default_timezone()).isoformat()
                else:
                    expires_str = expires_at.isoformat()
            else:
                expires_str = "no expiry set"
        except Exception:
            expires_str = "unknown"

        subject = f"You've been invited to join {project_name}"
        message = (
            f"{inviter_name} has invited you to join the project \"{project_name}\".\n\n"
            f"To accept, open the link below (or paste it in your browser):\n\n"
            f"{invite_url}\n\n"
            f"This invitation expires on {expires_str}.\n\n"
            "If you already have an account, sign in first then open the link. "
            "If you don't have an account, register using the same email address and include the invite token "
            "during registration or accept the invite after login.\n\n"
            "If you did not expect this invitation, ignore this email.\n"
        )

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        recipient = [getattr(invitation, "email", None)]

        if not recipient or not recipient[0]:
            logger.warning("Invite email missing for invitation id=%s; skipping send", getattr(invitation, "pk", None))
            return

        try:
            send_mail(subject, message, from_email, recipient, fail_silently=False)
            logger.info("Invite email sent to %s for invitation id=%s", recipient[0], getattr(invitation, "pk", None))
        except Exception:
            # log full exception for ops debugging but don't raise
            logger.exception("Failed to send invite email for invitation id=%s to %s", getattr(invitation, "pk", None), recipient[0])

    except Exception:
        # top-level defensive catch
        logger.exception("Unexpected error while preparing/sending invite email for invitation id=%s", getattr(invitation, "pk", None))
