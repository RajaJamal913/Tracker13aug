# shifts/urls.py

from django.urls import path
from .views import (
    AttendanceCheckInAPIView,
    AttendanceListAPIView,
    ShiftListCreateAPIView,
    ShiftRetrieveUpdateAPIView,
    TrackedShiftsView,
    AssignedShiftsListAPIView,
    MyShiftNotificationsAPIView,
)

urlpatterns = [
    # list / create (shifts created by the request.user)
    path("shifts/", ShiftListCreateAPIView.as_view(), name="shift-list-create"),

    # list shifts where the current user is a member
    path("shifts/assigned/", AssignedShiftsListAPIView.as_view(), name="shift-assigned-list"),

    # notifications for the current user (Member)
    path("shifts/notifications/", MyShiftNotificationsAPIView.as_view(), name="shift-notifications"),

    # tracked hours endpoint
    path("shifts/tracked/", TrackedShiftsView.as_view(), name="tracked-shifts"),

    # retrieve / update a specific shift (creator-only permission enforced in the view)
    path("shifts/<int:pk>/", ShiftRetrieveUpdateAPIView.as_view(), name="shift-detail-update"),

     path("attendance/checkin/", AttendanceCheckInAPIView.as_view(), name="attendance-checkin"),
    path("attendance/", AttendanceListAPIView.as_view(), name="attendance-list"),
]
