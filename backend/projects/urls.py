from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, re_path
from .views import  AcceptInvitationView, InvitationListCreateView, ProjectCreateView, ProjectListView, ProjectMemberListView, get_members
from projects import views

urlpatterns = [
     path('createproject/',ProjectCreateView.as_view(),name='Createproject'),
       path('projects/', ProjectListView.as_view(), name='ListProjects'),  # ✅ Added GET API
         path('members/', views.get_members, name='members'),  # ✅ Added GET API
           path(
        "projects/<int:pk>/members/",
        ProjectMemberListView.as_view(),
        name="project-members"),
          path("invites/", InvitationListCreateView.as_view(), name="invite-list-create"),
     path('invites/accept/', AcceptInvitationView.as_view(), name='invite-accept'),

    # ALSO accept the no-trailing-slash POST (prevents APPEND_SLASH redirect issues)
    re_path(r'^invites/accept$', AcceptInvitationView.as_view(), name='invite-accept-no-slash'),

]


urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
