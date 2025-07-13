# tracker/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import WorkSessionViewSet, tracker_list

router = DefaultRouter()
router.register('sessions', WorkSessionViewSet, basename='session')

urlpatterns = [
    # CRUD on individual sessions:
    path('', include(router.urls)),
    # Aggregated tracker endpoint:
    path('tracker/', tracker_list, name='tracker-list'),
]
