# utils.py
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

def build_invite_url(token: str) -> str:
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")
    return f"{frontend_base.rstrip('/')}/UserSignup?invite={token}"

def send_invite_email_plain(invitation):
    invite_url = build_invite_url(invitation.token)
    subject = f"You're invited to join project {invitation.project.name}"
    message = (
        f"{invitation.created_by.get_full_name() or invitation.created_by.username} has invited you to join "
        f"the project \"{invitation.project.name}\".\n\n"
        f"To accept, open the link below (or paste it in your browser):\n\n"
        f"{invite_url}\n\n"
        f"This invitation expires on {invitation.expires_at.isoformat()}.\n\n"
        "If you already have an account, sign in first then open the link. "
        "If you don't have an account, register using the same email address and include the invite token "
        "during registration or accept the invite after login.\n\n"
        "If you did not expect this invitation, ignore this email."
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    send_mail(subject, message, from_email, [invitation.email], fail_silently=False)
