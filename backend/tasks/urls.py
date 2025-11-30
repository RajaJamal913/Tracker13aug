from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
## urls.py
# tasks/urls.py
from django.urls import path
from .views import MyAssignedTasksView, TaskCreateView, TaskListView, TaskDetailView

urlpatterns = [
    path("tasks/", TaskListView.as_view(), name="task-list"),
    path("tasks/create/", TaskCreateView.as_view(), name="task-create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
    path("tasks/my/", MyAssignedTasksView.as_view(), name="task-my-list"),
]


urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
