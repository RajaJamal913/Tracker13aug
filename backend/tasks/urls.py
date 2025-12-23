# tasks/urls.py
from django.urls import path
from .views import (
    TaskCreateView,
    TaskListView,
    TaskDetailView,
    MyAssignedTasksView,
)

urlpatterns = [
    # List all tasks or filter by project (?project=<project_id>)
    path("tasks/", TaskListView.as_view(), name="task-list"),

    # Create a new task
    path("tasks/create/", TaskCreateView.as_view(), name="task-create"),

    # Retrieve / Update / Delete a task by ID
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),

    # Get tasks assigned to the current logged-in user
    path("tasks/my/", MyAssignedTasksView.as_view(), name="task-my-list"),
]
