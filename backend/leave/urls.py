# leaveapp/urls.py

from django.urls import path
from .views import (
    LeavePolicyListCreateView,
    LeavePolicyDetailView,
    LeaveRequestListView,
    LeaveRequestCreateView,
    LeaveRequestApproveView,
    LeaveRequestRejectView,
)

urlpatterns = [
    # Leave Policies
    path("leave-policies/", LeavePolicyListCreateView.as_view(), name="leavepolicy-list-create"),
    path("leave-policies/<int:pk>/", LeavePolicyDetailView.as_view(), name="leavepolicy-detail"),

    # Leave Requests
    path("leaves/", LeaveRequestListView.as_view(), name="leaverequest-list"),
    path("leaves/create/", LeaveRequestCreateView.as_view(), name="leaverequest-create"),
    path("leaves/<int:pk>/approve/", LeaveRequestApproveView.as_view(), name="leaverequest-approve"),
    path("leaves/<int:pk>/reject/", LeaveRequestRejectView.as_view(), name="leaverequest-reject"),
]
