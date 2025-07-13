from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from .views import ProjectCreateView, ProjectListView, ProjectMemberListView, get_members
from projects import views

urlpatterns = [
     path('createproject/',ProjectCreateView.as_view(),name='Createproject'),
       path('projects/', ProjectListView.as_view(), name='ListProjects'),  # ✅ Added GET API
         path('members/', views.get_members, name='members'),  # ✅ Added GET API
           path(
        "projects/<int:pk>/members/",
        ProjectMemberListView.as_view(),
        name="project-members")
]


urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
