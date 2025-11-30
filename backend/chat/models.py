from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from django.utils import timezone

from projects.models import Member

# reuse your Member model (from projects app)
# from projects.models import Member   # adjust import if Member is in another app
# we will reference Member by string to avoid circular imports below

class DirectMessage(models.Model):
    MESSAGE_TEXT = "text"
    MESSAGE_IMAGE = "image"
    MESSAGE_FILE = "file"
    MESSAGE_CHOICES = [
        (MESSAGE_TEXT, "Text"),
        (MESSAGE_IMAGE, "Image"),
        (MESSAGE_FILE, "File"),
    ]

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_direct_messages",
    )
    # recipient is a Member (the person receiving the message)
    recipient = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="received_direct_messages",
    )

    content = models.TextField(blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_CHOICES, default=MESSAGE_TEXT)
    file = models.FileField(upload_to="direct_messages/", null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at",)

    def mark_read(self):
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=["read", "read_at"])

    def __str__(self):
        return f"DM {self.pk} from {self.sender} to {self.recipient}"

class Channel(models.Model):
    CHANNEL = "channel"
    DIRECT = "direct"
    TYPE_CHOICES = [(CHANNEL, "Channel"), (DIRECT, "Direct")]

    name = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=CHANNEL)
    participants = models.ManyToManyField("projects.Member", related_name="chat_channels", blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_channels")
    created_at = models.DateTimeField(auto_now_add=True)
    last_message = models.TextField(blank=True, null=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_private = models.BooleanField(default=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        if self.name:
            return self.name
        return f"{self.type} #{self.pk}"


class Message(models.Model):
    MESSAGE_TEXT = "text"
    MESSAGE_IMAGE = "image"
    MESSAGE_FILE = "file"
    MESSAGE_CHOICES = [
        (MESSAGE_TEXT, "Text"),
        (MESSAGE_IMAGE, "Image"),
        (MESSAGE_FILE, "File"),
    ]

    channel = models.ForeignKey(Channel, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField(blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_CHOICES, default=MESSAGE_TEXT)
    file = models.FileField(upload_to="chat_files/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # track read receipts by Member (so we can show unread counts)
    read_by = models.ManyToManyField("projects.Member", related_name="read_messages", blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.pk} by {self.sender}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # update parent channel last_message / last_message_at
        try:
            self.channel.last_message = (self.content[:200] if self.content else (self.file.name if self.file else ""))
            self.channel.last_message_at = self.created_at or timezone.now()
            self.channel.save(update_fields=["last_message", "last_message_at"])
        except Exception:
            # avoid raising in save
            pass
