
# timesheet/urls.py
from django.urls import path
from .views import TimeEntryListCreateView, TimeEntryDetailView

urlpatterns = [
    # GET & POST /api/addtime/
    path('addtime/', TimeEntryListCreateView.as_view(), name='timeentry-list-create'),
    # GET, PATCH, DELETE /api/addtime/<id>/
    path('addtime/<int:pk>/', TimeEntryDetailView.as_view(), name='timeentry-detail'),
]
