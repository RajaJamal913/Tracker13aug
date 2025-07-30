from django.urls import path
from .views import TrackedHoursReportView

urlpatterns = [
    path('reports/tracked-hours/', TrackedHoursReportView.as_view(), name='tracked-hours-report'),
]
