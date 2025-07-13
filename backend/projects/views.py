from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import generics,permissions
from django.db.models import Q
from .models import Project
from .serializers import ProjectSerializer
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db.models import Count
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Member
from .serializers import MemberSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.contrib.auth import get_user_model

User = get_user_model()
# Helper function to ensure a user is wrapped in a Member object and added to the project
def assign_user_to_project(project: Project, user):
    member_obj, created = Member.objects.get_or_create(user=user)
    project.members.add(member_obj)
    project.save()

class ProjectCreateView(generics.CreateAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        # Add the creator as a Member
        assign_user_to_project(project, self.request.user)
    
    def post(self, request, *args, **kwargs):
        print("Received Data:", request.data)  # ✅ Debugging line

        serializer = self.get_serializer(data=request.data)  # Use get_serializer to include context
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=201)

        print("Errors:", serializer.errors)  # ✅ Debugging line
        return Response(serializer.errors, status=400)
    

class ProjectListView(generics.ListAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            return Project.objects.none()

        return (
            Project.objects
            .filter(Q(created_by=user) | Q(members__user=user))
            .annotate(tasks_count=Count("tasks"))
            .distinct()
        )

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]
  

    def get_queryset(self):
        user = self.request.user

        if not user or user.is_anonymous:
            # If you instead want “anyone can see all projects,” do:
            # return Project.objects.annotate(tasks_count=Count('tasks'))
            return Project.objects.none()

        return Project.objects.filter(
            Q(created_by=user) | Q(members__user=user)
        ).distinct().annotate(
            tasks_count=Count('tasks')
        )
    

@api_view(["GET"])
@permission_classes([AllowAny])
def get_members(request):
    members = Member.objects.select_related("user").all()
    serializer = MemberSerializer(members, many=True)
    return Response(serializer.data)

class ProjectMemberListView(generics.ListAPIView):
    """
    GET /api/projects/<pk>/members/  →  [ { id, user, role, username }, … ]
    """
    serializer_class = MemberSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        project_id = self.kwargs["pk"]
        return (
            Member.objects
                  .filter(projects__id=project_id)   # <<-- use this
                  .select_related("user")
        )
    