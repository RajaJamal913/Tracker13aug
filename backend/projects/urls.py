# urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, re_path

# import local views directly
from .views import (
    AcceptInvitationView,
    InvitationListCreateView,
    ProjectCreateView,
    ProjectListView,
    ProjectMemberListView,
    TeamDetailView,
    TeamListCreateView,
    get_members,
)

urlpatterns = [
    path('createproject/', ProjectCreateView.as_view(), name='Createproject'),
    path('projects/', ProjectListView.as_view(), name='ListProjects'),
    path('members/', get_members, name='members'),
    path('projects/<int:pk>/members/', ProjectMemberListView.as_view(), name='project-members'),
    path('invites/', InvitationListCreateView.as_view(), name='invite-list-create'),
    path('invites/accept/', AcceptInvitationView.as_view(), name='invite-accept'),
    re_path(r'^invites/accept$', AcceptInvitationView.as_view(), name='invite-accept-no-slash'),
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/<int:pk>/', TeamDetailView.as_view(), name='team-detail'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
