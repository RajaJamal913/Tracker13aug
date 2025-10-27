# Replace your existing TrackedHoursReportView with this implementation
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from projects.models import Project, Member
from realtimemonitoring.models import WorkSession
import logging

logger = logging.getLogger(__name__)

class TrackedHoursReportView(APIView):
    """
    GET /api/reports/tracked-hours/?projects=1,2&date=YYYY-MM-DD&debug=1

    Behavior:
      - If Project.created_by is a User FK -> use created_by == request.user to detect owners
      - If Project.created_by is a Member FK -> use created_by__user == request.user to detect owners
      - Returns grouped project objects with `members` list (member_id, member_name, total_seconds)
      - If ?debug=1 is passed, returns an extra `__debug` field with diagnostics
    """
    permission_classes = [permissions.IsAuthenticated]

    def _member_label(self, m):
        if not m:
            return None
        user = getattr(m, "user", None)
        if user and getattr(user, "username", None):
            return user.username
        if getattr(m, "username", None):
            return m.username
        fn = getattr(m, "first_name", "") or ""
        ln = getattr(m, "last_name", "") or ""
        name = f"{fn} {ln}".strip()
        if name:
            return name
        return f"Member #{getattr(m, 'id', '?')}"

    def _detect_created_by_target(self):
        """
        Returns tuple (target_model, is_member_fk, is_user_fk)
        target_model is the remote model for created_by FK if available, else None.
        """
        try:
            field = Project._meta.get_field("created_by")
            rel_model = field.remote_field.model if getattr(field, "remote_field", None) else None
            # compare by class or by model name (both safe)
            is_member_fk = rel_model == Member or (getattr(rel_model, "__name__", "") == "Member")
            # If User not imported here, just check name
            is_user_fk = (getattr(rel_model, "__name__", "") in ("User", "AbstractUser", "CustomUser"))
            return rel_model, is_member_fk, is_user_fk
        except Exception:
            return None, False, False

    def get(self, request):
        user = request.user
        qs_projects = request.query_params.get("projects")
        qs_date = request.query_params.get("date")
        debug_flag = request.query_params.get("debug") in ("1", "true", "yes", "on")

        project_filter_ids = None
        if qs_projects:
            try:
                project_filter_ids = [int(x) for x in qs_projects.split(",") if x.strip()]
            except ValueError:
                return Response({"detail": "invalid projects param"}, status=status.HTTP_400_BAD_REQUEST)

        # Try to get Member record for the requesting user (may not exist)
        try:
            current_member = Member.objects.get(user=user)
            current_member_id = current_member.id
        except Member.DoesNotExist:
            current_member = None
            current_member_id = None

        # Detect whether created_by relation is a Member FK or User FK
        rel_model, created_by_is_member_fk, created_by_is_user_fk = self._detect_created_by_target()

        # Build visible_projects depending on created_by target type
        if created_by_is_member_fk:
            # created_by is Member, so owners are projects whose created_by.user == request.user
            visible_q = Q(created_by__user=user) | Q(members__user=user)
        else:
            # fallback: treat created_by as User FK (or unknown) -> compare to request.user
            visible_q = Q(created_by=user) | Q(members__user=user)

        visible_projects = Project.objects.filter(visible_q).distinct()

        if project_filter_ids is not None:
            visible_projects = visible_projects.filter(id__in=project_filter_ids)

        # split owner vs non-owner projects
        if created_by_is_member_fk:
            owner_projects = visible_projects.filter(created_by__user=user)
            non_owner_projects = visible_projects.exclude(created_by__user=user)
        else:
            owner_projects = visible_projects.filter(created_by=user)
            non_owner_projects = visible_projects.exclude(created_by=user)

        owner_ids = list(owner_projects.values_list("id", flat=True))
        non_owner_ids = list(non_owner_projects.values_list("id", flat=True))

        # Prepare a date filter for WorkSession if provided (adjust field name if needed)
        ws_filter_kwargs = {}
        if qs_date:
            # adjust to your WorkSession model: e.g., started_at__date or created_at__date
            # If WorkSession has a 'date' field (string), you can use 'date' directly as below:
            ws_filter_kwargs["started_at__date"] = qs_date  # most common pattern
            # If your WorkSession uses a plain 'date' field, replace with ws_filter_kwargs['date'] = qs_date

        response_map = {}

        # OWNER projects: totals + per-member aggregates
        if owner_ids:
            owner_totals = (
                WorkSession.objects.filter(project_id__in=owner_ids, **ws_filter_kwargs)
                .values("project_id", "project__name")
                .annotate(total_seconds=Sum("accumulated"))
            )
            for item in owner_totals:
                pid = item["project_id"]
                response_map[pid] = {
                    "project_id": pid,
                    "project_name": item.get("project__name") or f"Project #{pid}",
                    "total_seconds": int(item.get("total_seconds") or 0),
                    "members": [],
                }

            per_member = (
                WorkSession.objects.filter(project_id__in=owner_ids, **ws_filter_kwargs)
                .values("project_id", "member")
                .annotate(total_seconds=Sum("accumulated"))
            )

            # Bulk fetch Member objects referenced by per_member
            member_ids = {row["member"] for row in per_member if row.get("member")}
            members_map = {}
            if member_ids:
                for m in Member.objects.filter(id__in=member_ids).select_related("user"):
                    members_map[m.id] = m

            # attach member aggregates
            per_project_member = {}
            for row in per_member:
                pid = row["project_id"]
                mid = row["member"]
                secs = int(row.get("total_seconds") or 0)
                per_project_member.setdefault(pid, []).append({"member_id": mid, "total_seconds": secs})

            for pid, members_list in per_project_member.items():
                target = response_map.get(pid)
                if not target:
                    response_map[pid] = {"project_id": pid, "project_name": f"Project #{pid}", "total_seconds": 0, "members": []}
                    target = response_map[pid]
                member_entries = []
                for mr in members_list:
                    mid = mr["member_id"]
                    secs = mr["total_seconds"]
                    mobj = members_map.get(mid)
                    member_entries.append({
                        "member_id": mid,
                        "member_name": self._member_label(mobj) or f"Member #{mid}",
                        "total_seconds": secs,
                    })
                member_entries.sort(key=lambda x: (x["member_name"] or "").lower())
                target["members"] = member_entries

            # include assigned-but-zero-hour members
            projects_with_members = Project.objects.filter(id__in=owner_ids).prefetch_related("members__user")
            for proj in projects_with_members:
                pid = proj.id
                assigned_members = list(proj.members.all())
                target = response_map.get(pid)
                if target is None:
                    response_map[pid] = {"project_id": pid, "project_name": proj.name, "total_seconds": 0, "members": []}
                    target = response_map[pid]
                existing_ids = {m["member_id"] for m in target["members"] if m.get("member_id")}
                for m in assigned_members:
                    if getattr(m, "id", None) not in existing_ids:
                        target["members"].append({
                            "member_id": m.id,
                            "member_name": self._member_label(m),
                            "total_seconds": 0,
                        })
                target["members"].sort(key=lambda x: (x["member_name"] or "").lower())

        # NON-OWNER projects: show only current_member totals
        if current_member and non_owner_ids:
            personal_qs = WorkSession.objects.filter(member=current_member, project_id__in=non_owner_ids, **ws_filter_kwargs)
            personal_agg = personal_qs.values("project_id", "project__name").annotate(total_seconds=Sum("accumulated"))
            for item in personal_agg:
                pid = item["project_id"]
                if pid in response_map:
                    continue
                secs = int(item.get("total_seconds") or 0)
                response_map[pid] = {
                    "project_id": pid,
                    "project_name": item.get("project__name") or f"Project #{pid}",
                    "total_seconds": secs,
                    "members": [
                        {
                            "member_id": current_member.id,
                            "member_name": self._member_label(current_member),
                            "total_seconds": secs,
                        }
                    ],
                }

        final = sorted(response_map.values(), key=lambda x: (x.get("project_name") or "").lower())

        # If debug flag is present, return debug info alongside `results`
        if debug_flag:
            debug = {
                "request_user_id": getattr(user, "id", None),
                "request_username": getattr(user, "username", None),
                "current_member_id": current_member_id,
                "created_by_relation_remote_model": getattr(rel_model, "__name__", str(rel_model)),
                "created_by_is_member_fk": created_by_is_member_fk,
                "created_by_is_user_fk": created_by_is_user_fk,
                "owner_project_ids_detected": owner_ids,
                "visible_project_ids": list(visible_projects.values_list("id", flat=True)),
                "non_owner_ids": non_owner_ids,
            }
            return Response({"results": final, "__debug": debug}, status=status.HTTP_200_OK)

        return Response(final, status=status.HTTP_200_OK)
