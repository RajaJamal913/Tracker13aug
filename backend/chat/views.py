import logging

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

# Channels
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Channel, Message, DirectMessage
from .serializers import ChannelSerializer, MessageSerializer, DirectMessageSerializer
from projects.models import Member  # adjust import if your app layout differs

logger = logging.getLogger(__name__)

# fallback test file url used in payloads if serializer/file URL is not present
FALLBACK_TEST_FILE_URL = "/mnt/data/63cb2eb9-b7cf-4c6b-9612-405439c966e2.png"


class DirectMessageViewSet(viewsets.ModelViewSet):
    """
    API for direct messages (one-to-one between Members).

    - GET ?member=<member_pk>  -> messages between request.user and Member(member_pk)
    - POST (multipart/form-data) -> create DM. Required: recipient_id (Member PK)
    """
    serializer_class = DirectMessageSerializer
    queryset = DirectMessage.objects.all().order_by("created_at")
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        member_id = self.request.query_params.get("member")
        if not member_id:
            return qs.none()

        try:
            other_member = Member.objects.get(pk=member_id)
        except Member.DoesNotExist:
            return qs.none()

        user = self.request.user
        # find requester Member record
        my_member = getattr(user, "member_profile", None) or Member.objects.filter(user=user).first()
        if not my_member:
            return qs.none()

        other_user = getattr(other_member, "user", None)
        if other_user is None:
            return qs.none()

        return qs.filter(
            (Q(sender=user) & Q(recipient=other_member)) |
            (Q(sender=other_user) & Q(recipient=my_member))
        ).order_by("created_at")

    def perform_create(self, serializer):
        """
        Ensure sender is the authenticated user.
        Use transaction.atomic so file save + model save are atomic.
        """
        with transaction.atomic():
            serializer.save(sender=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Create direct message. Accepts multipart/form-data (file uploads).
        Must include recipient_id (Member PK).
        Uses request.data directly so uploaded files in request.FILES are preserved.
        Broadcasts the created message to relevant groups (non-fatal).
        """
        # log incoming files for debugging
        logger.debug("DirectMessage.create called. FILES keys: %s", list(request.FILES.keys()))

        recipient_id = request.data.get("recipient_id")
        if not recipient_id:
            return Response({"recipient_id": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient_member = Member.objects.get(pk=recipient_id)
        except Member.DoesNotExist:
            return Response({"recipient_id": "Member not found."}, status=status.HTTP_400_BAD_REQUEST)

        # Use request.data (not a copy) so DRF parsers keep request.FILES intact
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Build a consistent broadcast payload for realtime consumers
        try:
            try:
                sender_member = request.user.member_profile
                sender_member_pk = sender_member.pk
            except Exception:
                sender_member_pk = None

            recipient_pk = recipient_member.pk

            payload = {
                "id": serializer.data.get("id"),
                "channel_for_recipient": f"dm-{recipient_pk}",
                "channel_for_sender": (f"dm-{sender_member_pk}" if sender_member_pk is not None else None),
                "channel": f"dm-{recipient_pk}",  # canonical channel key
                "sender_id": serializer.data.get("sender_id"),
                "sender_username": serializer.data.get("sender_username"),
                "sender_member_id": sender_member_pk,
                "recipient_member": serializer.data.get("recipient_member"),
                "content": serializer.data.get("content"),
                "message_type": serializer.data.get("message_type"),
                "file_url": serializer.data.get("file_url") or FALLBACK_TEST_FILE_URL,
                "created_at": serializer.data.get("created_at"),
            }

            channel_layer = get_channel_layer()
            if channel_layer is not None:
                recipient_group = f"dm_{recipient_pk}"
                async_to_sync(channel_layer.group_send)(
                    recipient_group,
                    {"type": "chat.message", "message": payload},
                )
                if sender_member_pk:
                    sender_group = f"dm_{sender_member_pk}"
                    async_to_sync(channel_layer.group_send)(
                        sender_group,
                        {"type": "chat.message", "message": payload},
                    )
        except Exception:
            # broadcasting must not break API response
            logger.exception("Failed to broadcast DM (non-fatal)")

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_read(self, request, pk=None):
        dm = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            my_member = request.user.member_profile
        except Exception:
            return Response({"detail": "Member profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(dm.recipient, "pk", None) != my_member.pk:
            return Response({"detail": "Only recipient can mark read"}, status=status.HTTP_403_FORBIDDEN)
        dm.mark_read()
        return Response({"marked": True})


class ChannelViewSet(viewsets.ModelViewSet):
    """
    Group/channel endpoints for multi-participant channels.
    """
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        try:
            member = user.member_profile
            return Channel.objects.filter(participants=member).distinct()
        except Exception:
            return Channel.objects.none()

    def perform_create(self, serializer):
        """
        Save the channel, and always ensure the creator is added to participants.
        This prevents the creator from being excluded when the frontend provides
        participant_ids that do not include the creator.
        """
        channel = serializer.save(created_by=self.request.user)
        try:
            # prefer .member_profile but fall back to Member lookup
            creator_member = getattr(self.request.user, "member_profile", None) or Member.objects.filter(user=self.request.user).first()
            if creator_member and not channel.participants.filter(pk=creator_member.pk).exists():
                channel.participants.add(creator_member)
        except Exception:
            # non-fatal; log for debugging
            logger.exception("Failed to add creator to channel participants (non-fatal)")

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def messages(self, request, pk=None):
        channel = get_object_or_404(self.get_queryset(), pk=pk)
        qs = channel.messages.select_related("sender").all().order_by("created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = MessageSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(ser.data)
        ser = MessageSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_read(self, request, pk=None):
        channel = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            member = request.user.member_profile
        except Exception:
            return Response({"detail": "Member profile not found"}, status=status.HTTP_400_BAD_REQUEST)
        unread = channel.messages.exclude(read_by=member)
        for m in unread:
            m.read_by.add(member)
        return Response({"marked": unread.count()})


class MessageViewSet(viewsets.ModelViewSet):
    """
    Messages for group channels (uses Message model).
    """
    queryset = Message.objects.select_related("channel", "sender").all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        try:
            member = user.member_profile
            return Message.objects.filter(channel__participants=member)
        except Exception:
            return Message.objects.none()

    def perform_create(self, serializer):
        # Ensure sender is set from authenticated user
        with transaction.atomic():
            serializer.save(sender=self.request.user)

    def create(self, request, *args, **kwargs):
        data = request.data  # do not copy; keep FILES intact
        channel_id = data.get("channel")
        if not channel_id:
            return Response({"channel": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        channel = get_object_or_404(Channel, pk=channel_id)
        try:
            member = request.user.member_profile
        except Exception:
            return Response({"detail": "Member profile required"}, status=status.HTTP_400_BAD_REQUEST)

        if not channel.participants.filter(pk=member.pk).exists():
            return Response({"detail": "You are not a participant of this channel."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Broadcast to channel participants group (non-fatal)
        try:
            channel_layer = get_channel_layer()
            if channel_layer is not None:
                payload = {
                    "id": serializer.data.get("id"),
                    "channel": f"channel-{channel.pk}",
                    "sender_id": serializer.data.get("sender_id"),
                    "sender_username": serializer.data.get("sender_username"),
                    "content": serializer.data.get("content"),
                    "message_type": serializer.data.get("message_type"),
                    "file_url": serializer.data.get("file_url") or FALLBACK_TEST_FILE_URL,
                    "created_at": serializer.data.get("created_at"),
                }
                async_to_sync(channel_layer.group_send)(
                    f"channel_{channel.pk}",
                    {"type": "chat.message", "message": payload},
                )
        except Exception:
            logger.exception("Failed to broadcast channel message (non-fatal)")

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
