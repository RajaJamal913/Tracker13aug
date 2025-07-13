# leaveapp/views.py

from django.utils import timezone
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LeavePolicy, LeaveRequest
from .serializers import LeavePolicySerializer, LeaveRequestSerializer
from projects.models import Member


####### LEAVE POLICY VIEWS ########

class LeavePolicyListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/leave-policies/   -> list all LeavePolicy objects
    POST /api/leave-policies/   -> create a new LeavePolicy
    """
    queryset = LeavePolicy.objects.all().order_by("name")
    serializer_class = LeavePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    # Optionally, you could require admin privileges to POST new policies:
    # def get_permissions(self):
    #     if self.request.method == "POST":
    #         return [permissions.IsAdminUser()]
    #     return [permissions.IsAuthenticated()]


class LeavePolicyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/leave-policies/<pk>/   -> retrieve a single policy
    PUT    /api/leave-policies/<pk>/   -> update (admin only)
    DELETE /api/leave-policies/<pk>/   -> delete  (admin only)
    """
    queryset = LeavePolicy.objects.all()
    serializer_class = LeavePolicySerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "DELETE"]:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


####### LEAVE REQUEST VIEWS ########

class LeaveRequestListView(generics.ListAPIView):
    """
    GET /api/leaves/?status=pending   -> list all pending requests
    GET /api/leaves/?status=approved  -> list all approved requests
    GET /api/leaves/?status=rejected  -> list all rejected requests
    (If no 'status' query param, defaults to all requests belonging to the user.)
    """
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            member = Member.objects.get(user=user)
        except Member.DoesNotExist:
            return LeaveRequest.objects.none()

        status_filter = self.request.query_params.get("status", None)
        if status_filter in ["pending", "approved", "rejected"]:
            # Admin users see all; normal users see only their own
            if user.is_staff:
                return LeaveRequest.objects.filter(status=status_filter).order_by("-created_on")
            return LeaveRequest.objects.filter(member=member, status=status_filter).order_by("-created_on")

        # If no valid status query param, default to current user’s leaves (all statuses)
        if user.is_staff:
            return LeaveRequest.objects.all().order_by("-created_on")
        return LeaveRequest.objects.filter(member=member).order_by("-created_on")


class LeaveRequestCreateView(generics.CreateAPIView):
    """
    POST /api/leaves/
    Create a new leave request. Payload:
    {
      "policy": <policy_id>,
      "reason": "some reason",
      "start_date": "2025-06-01",
      "end_date": "2025-06-03"
    }
    """
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]


class LeaveRequestApproveView(APIView):
    """
    PUT /api/leaves/<pk>/approve/  
    Mark a pending leave as approved. Only staff members (admins) can approve.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        user = request.user
        if not user.is_staff:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            leave_req = LeaveRequest.objects.get(pk=pk, status="pending")
        except LeaveRequest.DoesNotExist:
            return Response({"detail": "Pending LeaveRequest not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            approver = Member.objects.get(user=user)
        except Member.DoesNotExist:
            return Response({"detail": "No Member record found for user."}, status=status.HTTP_404_NOT_FOUND)

        leave_req.status = "approved"
        leave_req.approved_on = timezone.now()
        leave_req.approved_by = approver
        leave_req.rejection_reason = ""
        leave_req.save()

        serializer = LeaveRequestSerializer(leave_req)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LeaveRequestRejectView(APIView):
    """
    PUT /api/leaves/<pk>/reject/  
    Reject a pending leave. Only staff members can reject.
    Payload: { "rejection_reason": "some text" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        user = request.user
        if not user.is_staff:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            leave_req = LeaveRequest.objects.get(pk=pk, status="pending")
        except LeaveRequest.DoesNotExist:
            return Response({"detail": "Pending LeaveRequest not found."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get("rejection_reason", "").strip()
        if not reason:
            return Response({"detail": "rejection_reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            approver = Member.objects.get(user=user)
        except Member.DoesNotExist:
            return Response({"detail": "No Member record found for user."}, status=status.HTTP_404_NOT_FOUND)

        leave_req.status = "rejected"
        leave_req.approved_on = timezone.now()
        leave_req.approved_by = approver
        leave_req.rejection_reason = reason
        leave_req.save()

        serializer = LeaveRequestSerializer(leave_req)
        return Response(serializer.data, status=status.HTTP_200_OK)
