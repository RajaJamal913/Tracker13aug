from django.contrib import admin, messages
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Invitation, Project
User = get_user_model()
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'billable', 'start_date', 'end_date', 'time_estimate', 'budget_estimate', 'created_at')
    list_filter = ('billable', 'start_date', 'end_date')
    search_fields = ('name', 'notes')
    ordering = ('-created_at',)

    # Ensuring clean() validation runs in the admin panel
    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)

admin.site.register(Project, ProjectAdmin)
from django.contrib import admin
from .models import Member

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "project_count")
    list_filter = ("role",)
    search_fields = ("user__username",)
    ordering = ("user__username",)

    def project_count(self, obj):
        return obj.projects.count()
    project_count.short_description = "Projects"


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "project",
        "role",
        "created_by",
        "created_at",
        "accepted",
        "accepted_at",
        "token_short",
    )
    list_filter = ("accepted", "project", "created_by", "role", "created_at")
    search_fields = ("email", "token", "project__name", "created_by__username")
    readonly_fields = ("token", "created_at", "accepted_at")
    actions = ("mark_accepted", "mark_revoked", "create_member_from_invite")
    ordering = ("-created_at",)

    def token_short(self, obj):
        if not obj.token:
            return "-"
        return obj.token[:10] + "…" if len(obj.token) > 12 else obj.token
    token_short.short_description = "Token"

    def mark_accepted(self, request, queryset):
        """Admin action: set accepted=True and set accepted_at to now"""
        updated = 0
        for inv in queryset:
            if not inv.accepted:
                inv.accepted = True
                inv.accepted_at = timezone.now()
                inv.save(update_fields=["accepted", "accepted_at"])
                updated += 1
        if updated:
            self.message_user(request, f"Marked {updated} invitation(s) as accepted.", level=messages.SUCCESS)
        else:
            self.message_user(request, "No invitations were changed (all already accepted).", level=messages.INFO)
    mark_accepted.short_description = "Mark selected invitations as accepted"

    def mark_revoked(self, request, queryset):
        """Admin action: unset accepted and clear accepted_at"""
        revoked = 0
        for inv in queryset:
            if inv.accepted:
                inv.accepted = False
                inv.accepted_at = None
                inv.save(update_fields=["accepted", "accepted_at"])
                revoked += 1
        if revoked:
            self.message_user(request, f"Revoked {revoked} invitation(s).", level=messages.SUCCESS)
        else:
            self.message_user(request, "No invitations were revoked.", level=messages.INFO)
    mark_revoked.short_description = "Revoke selected invitations (set accepted=False)"

    def create_member_from_invite(self, request, queryset):
        """
        Admin action: For each accepted invitation, try to find a User with the same email.
        If a matching User exists, create or get a Member and attach it to the invitation's project.
        This lets you validate that the acceptance flow results in a Member row and that the project has that member.
        """
        created_count = 0
        missing_user_count = 0
        already_member_count = 0

        for inv in queryset:
            if not inv.accepted:
                # skip non-accepted invites
                continue

            # Try to find a corresponding user by email
            user = User.objects.filter(email__iexact=inv.email).first()
            if not user:
                missing_user_count += 1
                continue

            member_obj, created = Member.objects.get_or_create(user=user, defaults={"role": inv.role or ""})
            # add to project if not already present
            if member_obj not in inv.project.members.all():
                inv.project.members.add(member_obj)
                created_count += 1
            else:
                already_member_count += 1

        # Compose an informative admin message
        msgs = []
        if created_count:
            msgs.append(f"Added {created_count} member(s) to projects from accepted invites.")
        if already_member_count:
            msgs.append(f"{already_member_count} invite(s) already had associated members in the project.")
        if missing_user_count:
            msgs.append(f"{missing_user_count} invite(s) had no matching user account (by email).")

        if msgs:
            self.message_user(request, " — ".join(msgs), level=messages.SUCCESS)
        else:
            self.message_user(request, "No members were created. Ensure selected invites are accepted and users exist.", level=messages.INFO)
    create_member_from_invite.short_description = "Create Project Member(s) from accepted invitation(s)"
