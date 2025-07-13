1# realtimemonitoring/urls.py

from django.urls import path
from .views import  MembersStatusView, MonitorStatusView, MonitorStartView, MonitorStopView,BreakPolicyListCreateView, BreakPolicyRetrieveUpdateDestroyView,BreakStatusView, BreakStartView, BreakStopView

urlpatterns = [
     path("status/", MonitorStatusView.as_view(), name="monitor-status"),
    path("start/", MonitorStartView.as_view(), name="monitor-start"),
    path("stop/", MonitorStopView.as_view(), name="monitor-stop"),
      path("members-status/", MembersStatusView.as_view(), name="members-status"),

       path("break/policies/",           BreakPolicyListCreateView.as_view(),          name="breakpolicy-list-create"),
    path("break/policies/<int:pk>/",  BreakPolicyRetrieveUpdateDestroyView.as_view(), name="breakpolicy-detail"),

    # ─── BreakSession endpoints
    path("break/status/", BreakStatusView.as_view(), name="break-status"),
    path("break/start/",  BreakStartView.as_view(),  name="break-start"),
    path("break/stop/",   BreakStopView.as_view(),   name="break-stop"),

   
]
