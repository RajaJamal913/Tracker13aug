
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
   path('api/', include('accounts.urls')),
    path('api/', include('timesheet.urls')),
     path('api/', include('projects.urls')),
     path('api/', include('tasks.urls')),
     path("api/monitor/", include("realtimemonitoring.urls")),
     path("api/auth/", include("accounts.urls")),
       path("api/", include("leave.urls")),
       path("api/", include("shifts.urls")),
         path('api/', include('tracker.urls')),
           path('api/', include('reports.urls')),
           path("api/", include("task_api.urls")),
           path("api/twofactor/", include("twofactor.urls")),
           # backend/urls.py (or your project's urls)
           path("api/chat/", include("chat.urls")),

       
]
# Only add this when DEBUG is True (development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)