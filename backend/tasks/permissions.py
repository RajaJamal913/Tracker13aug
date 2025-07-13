# tasks/permissions.py
from rest_framework import permissions

class IsTaskAssigneeOrProjectOwner(permissions.BasePermission):
    """
    Object-level permission to allow only:
      - The Member assigned to the task (assignee.user == request.user), OR
      - The Project owner (task.project.created_by == request.user)
    to retrieve, update, or delete the Task.
    """

    def has_object_permission(self, request, view, obj):
        # If user is not authenticated at all, deny immediately :contentReference[oaicite:21]{index=21}
        if not request.user or request.user.is_anonymous:
            return False

        # Check if request.user is the project owner
        if obj.project.created_by == request.user:
            return True

        # Otherwise check if the request.user is the assigned Member
        return (obj.assignee is not None
                and obj.assignee.user == request.user)
