from rest_framework import permissions

class IsProjectOwnerOrMember(permissions.BasePermission):
    """
    Object‑level permission to allow only the project’s creator
    or its assigned members to view or edit it.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or request.user.is_anonymous:
            return False

        # 1) Creator always allowed
        if obj.created_by == request.user:
            return True

        # 2) Members allowed if there is a Member whose user == request.user
        return obj.members.filter(user=request.user).exists()
