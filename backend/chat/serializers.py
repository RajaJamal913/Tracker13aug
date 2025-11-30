# chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from projects.models import Member
from .models import DirectMessage, Message, Channel

User = get_user_model()


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source="sender.pk")
    sender_username = serializers.ReadOnlyField(source="sender.username")
    sender_member_id = serializers.SerializerMethodField(read_only=True)

    recipient_id = serializers.IntegerField(write_only=True)
    recipient_member = serializers.SerializerMethodField(read_only=True)
    file_url = serializers.SerializerMethodField(read_only=True)

    # NEW: explicit boolean indicating whether the requesting user is the sender
    is_sender = serializers.SerializerMethodField(read_only=True)

    # NEW: the member id of the *other* participant (helps frontend routing/unread)
    other_member_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DirectMessage
        fields = (
            "id",
            "sender_id",
            "sender_username",
            "sender_member_id",
            "recipient_id",
            "recipient_member",
            "content",
            "message_type",
            "file",
            "file_url",
            "read",
            "read_at",
            "created_at",
            # new fields
            "is_sender",
            "other_member_id",
        )
        read_only_fields = (
            "id",
            "sender_id",
            "sender_username",
            "sender_member_id",
            "file_url",
            "read",
            "read_at",
            "created_at",
            "recipient_member",
            "is_sender",
            "other_member_id",
        )

    def validate_recipient_id(self, value):
        try:
            Member.objects.get(pk=value)
        except Member.DoesNotExist:
            raise serializers.ValidationError("Recipient member not found.")
        return value

    def get_recipient_member(self, obj):
        try:
            recipient = getattr(obj, "recipient", None)
            if not recipient:
                return None
            user = getattr(recipient, "user", None)
            username = getattr(user, "username", None) if user else None
            name = ""
            if user:
                get_full = getattr(user, "get_full_name", None)
                if callable(get_full):
                    name = get_full() or ""
            return {"id": recipient.pk, "username": username, "name": name or ""}
        except Exception:
            try:
                return {"id": obj.recipient.pk}
            except Exception:
                return None

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        if obj.file:
            return obj.file.url
        return None

    def get_sender_member_id(self, obj):
        try:
            # prefer attribute if you have a reverse OneToOne relation named `member_profile`
            if hasattr(obj.sender, "member_profile"):
                return obj.sender.member_profile.pk
            m = Member.objects.filter(user=obj.sender).first()
            return m.pk if m else None
        except Exception:
            return None

    def get_is_sender(self, obj):
        """
        True if the current request user is the sender of this message.
        Serializer context must include 'request' (DRF default).
        """
        request = self.context.get("request", None)
        if not request or request.user.is_anonymous:
            return False
        return bool(obj.sender and obj.sender.pk == request.user.pk)

    def get_other_member_id(self, obj):
        """
        Return the member pk of the person who is not the requesting user.
        This helps frontend decide which conversation this message belongs to.
        """
        request = self.context.get("request", None)
        try:
            # recipient is a Member: its pk
            recipient_pk = getattr(obj.recipient, "pk", None)
            sender_member_pk = self.get_sender_member_id(obj)
            # If request user is sender -> other is recipient
            if request and obj.sender and request.user.pk == obj.sender.pk:
                return recipient_pk
            # else other is sender_member_pk
            return sender_member_pk
        except Exception:
            return None

    def create(self, validated_data):
        recipient_id = validated_data.pop("recipient_id", None)
        recipient = Member.objects.get(pk=recipient_id)
        validated_data["recipient"] = recipient
        return super().create(validated_data)


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source="sender.pk")
    sender_username = serializers.ReadOnlyField(source="sender.username")
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "channel", "sender_id", "sender_username", "content",
                  "message_type", "file", "file_url", "created_at")
        read_only_fields = ("id", "sender_id", "sender_username", "created_at", "file_url")

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        if obj.file:
            return obj.file.url
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and not request.user.is_anonymous:
            validated_data["sender"] = request.user
        return super().create(validated_data)


class ChannelSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField(read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    last_message = serializers.ReadOnlyField()
    last_message_at = serializers.ReadOnlyField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = ("id", "name", "type", "participants", "participant_ids",
                  "created_by", "created_at", "last_message", "last_message_at", "unread_count")
        read_only_fields = ("id", "created_by", "created_at", "last_message", "last_message_at", "unread_count")

    def get_participants(self, obj):
        return [{"id": m.pk, "username": getattr(m.user, "username", None), "name": (getattr(m.user, "get_full_name", lambda: "")() or "")} for m in obj.participants.all()]

    def get_unread_count(self, obj):
        request = self.context.get("request", None)
        if not request or request.user.is_anonymous:
            return 0
        try:
            member = request.user.member_profile
        except Exception:
            return 0
        return obj.messages.exclude(read_by=member).count()

    def create(self, validated_data):
        participant_objs = validated_data.pop("participant_ids", [])
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        channel = Channel.objects.create(**validated_data)
        if participant_objs:
            channel.participants.set(participant_objs)
        else:
            try:
                channel.participants.add(request.user.member_profile)
            except Exception:
                pass
        return channel

    def update(self, instance, validated_data):
        participant_objs = validated_data.pop("participant_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if participant_objs is not None:
            instance.participants.set(participant_objs)
        return instance
