# shifts/urls.py
from django.urls import path
from .views import ShiftListCreateAPIView, ShiftRetrieveUpdateAPIView, TrackedShiftsView

urlpatterns = [
    path("shifts/", ShiftListCreateAPIView.as_view(), name="shift-list-create"),
    path("<int:pk>/", ShiftRetrieveUpdateAPIView.as_view(), name="shift-detail-update"),
     path('shifts/tracked/', TrackedShiftsView.as_view(), name='tracked-shifts'),
]
