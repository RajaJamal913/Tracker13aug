# your_app/urls.py  (replace or merge into the app where TaskAIViewSet is defined)
from django.urls import path
from .views import TaskAIViewSet  # <- make sure this imports the TaskAIViewSet that contains `auto_assign`

urlpatterns = [
    path('tasksai/', TaskAIViewSet.as_view({'get': 'list', 'post': 'create'}), name='task-list-create'),
    path('tasksai/<int:pk>/', TaskAIViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='task-detail'),
    path('tasksai/<int:pk>/assign/', TaskAIViewSet.as_view({'post': 'assign'}), name='task-assign'),
    # IMPORTANT: map the action method name 'auto_assign' here
    path('tasksai/auto-assign/', TaskAIViewSet.as_view({'post': 'auto_assign'}), name='taskai-auto-assign'),
    path('tasksai/my/', TaskAIViewSet.as_view({'get': 'my'}), name='task-my'),
    # your_app/urls.py (merge with your existing endpoints)
    path('tasksai/stats/', TaskAIViewSet.as_view({'get': 'stats'}), name='taskai-stats'),
    path('tasksai/created/', TaskAIViewSet.as_view({'get': 'created'}), name='taskai-created'),
      path('tasksai/<int:pk>/reviews/', TaskAIViewSet.as_view({'get': 'reviews', 'post': 'create_review'}), name='task-reviews'),

]
