# views.py
import json
import re
import logging

from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import pagination
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from projects.models import Member

logger = logging.getLogger(__name__)

# Try to import openai; if unavailable we'll fall back to deterministic behavior
try:
    import openai  # pip install openai
    OPENAI_AVAILABLE = True
except Exception:
    openai = None
    OPENAI_AVAILABLE = False

User = get_user_model()

from .models import TaskAI, TaskReview
from .serializers import TaskAISerializer, TaskReviewSerializer


def _get_candidate_members(limit=200):
    """
    Defensive candidate loader returning compact dicts:
      { id, user_id (if present), name, email, skills, experience, developer_type, role, raw }
    Tries members.Member then falls back to auth.User.
    """
    candidates = []
    # Try Member model
    try:
        Member = apps.get_model("members", "Member")
    except Exception:
        Member = None

    if Member is not None:
        try:
            qs = Member.objects.filter(is_active=True).select_related("user")[:limit]
            for m in qs:
                try:
                    user = getattr(m, "user", None)
                    user_id = getattr(user, "id", None) if user else None
                    email = getattr(user, "email", None) if user else None
                    name = (
                        (getattr(user, "get_full_name", None) and user.get_full_name())
                        or getattr(user, "username", None)
                        or getattr(m, "username", None)
                        or getattr(m, "full_name", None)
                        or str(m)
                    )
                except Exception:
                    user_id = None
                    email = None
                    name = getattr(m, "username", None) or getattr(m, "full_name", None) or str(m)

                candidates.append({
                    "id": getattr(m, "id", None),
                    "user_id": user_id,
                    "name": name,
                    "email": email,
                    "skills": getattr(m, "skills", "") or "",
                    "experience": getattr(m, "experience", 0) or 0,
                    "role": getattr(m, "role", "") or "",
                    "developer_type": getattr(m, "developer_type", None) or getattr(m, "dev_type", None) or None,
                    "raw": {"member_pk": getattr(m, "pk", None)},
                })
            if candidates:
                return candidates
        except Exception:
            logger.exception("Error reading members.Member - falling back to auth.User")

    # Fallback: auth.User
    try:
        qs = User.objects.filter(is_active=True)[:limit]
        for u in qs:
            profile = getattr(u, "profile", None)
            skills = getattr(profile, "skills", "") if profile else (getattr(u, "skills", "") if hasattr(u, "skills") else "")
            experience = getattr(profile, "experience", 0) if profile else (getattr(u, "experience", 0) if hasattr(u, "experience") else 0)
            devtype = (getattr(profile, "developer_type", None) if profile else None) or getattr(u, "developer_type", None) or getattr(u, "dev_type", None) or None
            name = (getattr(u, "get_full_name", None) and u.get_full_name()) or getattr(u, "username", None) or str(u)
            email = getattr(u, "email", None)
            candidates.append({
                "id": getattr(u, "id", None),
                "user_id": getattr(u, "id", None),
                "name": name,
                "email": email,
                "skills": skills or "",
                "experience": experience or 0,
                "role": getattr(profile, "role", "") if profile else (getattr(u, "role", "") if hasattr(u, "role") else ""),
                "developer_type": devtype,
                "raw": {"user_pk": getattr(u, "pk", None)},
            })
    except Exception:
        logger.exception("Error reading auth.User for candidates")

    return candidates


def _extract_json_from_text(text: str):
    """
    Parse JSON or extract first JSON object/array substring and parse.
    """
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", text)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                return None
    return None


class TaskAIViewSet(viewsets.ModelViewSet):
    queryset = TaskAI.objects.all()
    serializer_class = TaskAISerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "web_desc", "mobile_desc", "figma_desc", "tags"]
    ordering_fields = ["deadline", "created_at", "priority"]

    def get_queryset(self):
        """
        Return the queryset visible to the requesting user.

        - Staff: full queryset.
        - Non-staff: tasks created by the user, tasks assigned to the user,
          or tasks that belong to projects the user is a member of.
        """
        user = self.request.user
        qs = super().get_queryset()
        if user.is_staff:
            return qs
        try:
            user_projects = user.project_set.all()
            return qs.filter(
                Q(created_by=user) | Q(assignee=user) | Q(project__in=user_projects)
            ).distinct()
        except Exception:
            return qs.filter(Q(created_by=user) | Q(assignee=user)).distinct()

    def perform_create(self, serializer):
        """
        Save TaskAI and try to auto-assign immediately (synchronously).
        Do NOT auto-assign if an assignee already exists or ai_suggested is True.
        """
        task = serializer.save()
        try:
            already_assigned = getattr(task, "assignee", None) is not None
            already_ai_suggested = bool(getattr(task, "ai_suggested", False))
            if not already_assigned and not already_ai_suggested:
                self._auto_assign_task_instance(task)
            else:
                logger.debug("Skipping auto-assign: already_assigned=%s, ai_suggested=%s", already_assigned, already_ai_suggested)
        except Exception:
            logger.exception("Auto-assign on create failed (continuing)")

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def assign(self, request, pk=None):
        """
        Robust assign endpoint:
         - permission: staff OR task.created_by (or authenticated if task.created_by is None)
         - blocks reassignment if task assignment is locked (ai_suggested/assignment_locked) unless staff or force=true
         - accepts assignee_id as either User.pk or Member.pk (Member -> .user)
         - uses QuerySet.update() to perform direct DB write (more robust)
         - creates a timesheet.Notification row synchronously (if model exists)
        """
        task = self.get_object()

        # Permission
        allowed = (
            request.user.is_staff
            or (task.created_by is not None and task.created_by == request.user)
            or (task.created_by is None and request.user.is_authenticated)
        )
        if not allowed:
            return Response({"detail": "Not allowed. Only staff or the task creator may assign tasks."}, status=status.HTTP_403_FORBIDDEN)

        # Locked check
        locked = bool(getattr(task, "assignment_locked", False)) or bool(getattr(task, "ai_suggested", False))
        force_override = bool(request.data.get("force", False))
        if locked and not request.user.is_staff and not force_override:
            return Response({"detail": "Task is locked from reassignment (AI-assigned). Contact staff to override."}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get("assignee_id")
        if not assignee_id:
            return Response({"detail": "assignee_id required"}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve assignee: try User(pk=...) first then Member(pk=...)->user
        assignee = None
        try:
            assignee = User.objects.get(pk=assignee_id)
        except Exception:
            try:
                Member = apps.get_model("members", "Member")
            except Exception:
                Member = None
            if Member is not None:
                try:
                    member = Member.objects.select_related("user").filter(pk=assignee_id).first()
                    if member and getattr(member, "user", None):
                        assignee = member.user
                except Exception:
                    logger.exception("Failed resolving Member(pk=%s) during assign", assignee_id)

        if not assignee:
            return Response({"detail": "assignee not found"}, status=status.HTTP_400_BAD_REQUEST)

        # Build update values
        now = timezone.now()
        update_values = {
            "assignee_id": assignee.pk,
            "assigned_by_id": request.user.pk,
            "assigned_at": now,
        }

        # handle optional ai metadata passed from client
        if "ai_suggested" in request.data:
            update_values["ai_suggested"] = bool(request.data.get("ai_suggested"))
        if "ai_confidence" in request.data:
            try:
                update_values["ai_confidence"] = int(request.data.get("ai_confidence")) if request.data.get("ai_confidence") is not None else None
            except (ValueError, TypeError):
                return Response({"detail": "ai_confidence must be integer 0-100"}, status=status.HTTP_400_BAD_REQUEST)
        if "ai_reason" in request.data:
            update_values["ai_reason"] = request.data.get("ai_reason")
        if "ai_meta" in request.data:
            update_values["ai_meta"] = request.data.get("ai_meta")

        # If staff forced override and assignment_locked exists, clear it in update
        if request.user.is_staff and force_override:
            if hasattr(task, "assignment_locked"):
                update_values["assignment_locked"] = False
            else:
                update_values["ai_suggested"] = False

        # If assignment was AI suggested or we mark it as such, lock it
        if request.data.get("ai_suggested") or bool(getattr(task, "ai_suggested", False)):
            if hasattr(task, "assignment_locked"):
                update_values["assignment_locked"] = True

        try:
            # Perform direct DB update
            TaskAI.objects.filter(pk=task.pk).update(**update_values)
            logger.info("Assign update: task %s set assignee_id=%s by user %s", task.pk, assignee.pk, request.user.pk)
        except Exception:
            logger.exception("Assign update failed for task %s", task.pk)
            return Response({"detail": "Failed to persist assignment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Refresh canonical task instance
        fresh = TaskAI.objects.filter(pk=task.pk).select_related("assignee", "assigned_by").first()

        # Create notification (timesheet.Notification) if available
        try:
            Notification = apps.get_model("timesheet", "Notification")
            try:
                Notification.objects.create(
                    recipient_id=fresh.assignee_id,
                    verb=f"You have been assigned to task: {fresh.title or fresh.pk}",
                    task_id=fresh.pk,
                )
                logger.info("Notification created for user %s about task %s", fresh.assignee_id, fresh.pk)
            except Exception:
                logger.exception("Failed creating Notification row for task %s", fresh.pk)
        except Exception:
            logger.debug("Notification model timesheet.Notification not found; skipping notification creation.")

        serializer = self.get_serializer(fresh)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my(self, request):
        """
        Return tasks the user created OR tasks assigned to the user (so members can review assigned tasks).
        Also include AI-suggested tasks that reference a Member row which maps to this user (inspect ai_meta).
        """
        user = request.user

        # Base queryset (fast DB lookup for created_by or direct assignee)
        qs = self.get_queryset().filter(Q(created_by=user) | Q(assignee=user)).distinct()

        # Try to append AI-suggested tasks that reference a Member that maps to this user
        extra_task_pks = []
        try:
            Member = apps.get_model("members", "Member")
        except Exception:
            Member = None

        if Member is not None:
            try:
                user_member = Member.objects.filter(user=user).first()
            except Exception:
                user_member = None

            if user_member:
                # Limit scanning to a reasonable slice to avoid heavy DB operation
                candidate_qs = TaskAI.objects.filter(ai_suggested=True).exclude(pk__in=qs.values_list("pk", flat=True))[:1000]

                for t in candidate_qs:
                    meta = getattr(t, "ai_meta", None) or {}
                    chosen = None
                    if isinstance(meta, dict):
                        chosen = meta.get("chosen") or meta.get("selection") or None

                    mid = None
                    if isinstance(chosen, dict):
                        mid = chosen.get("memberId") or chosen.get("member_id") or None
                        if not mid:
                            raw = chosen.get("meta") or chosen.get("meta_raw") or chosen.get("raw")
                            if isinstance(raw, dict):
                                mid = raw.get("member_pk") or raw.get("memberId") or raw.get("id") or None

                    if not mid and isinstance(meta, dict):
                        mid = meta.get("member_pk") or meta.get("chosen_member_pk") or None

                    if mid is not None and str(mid) == str(getattr(user_member, "pk", "")):
                        extra_task_pks.append(t.pk)

        # If we found extras, union them into qs
        if extra_task_pks:
            qs = qs | TaskAI.objects.filter(pk__in=extra_task_pks)

        # paginate + return
        page = self.paginate_queryset(qs.distinct())
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs.distinct(), many=True)
        return Response(serializer.data)

    # Auto-assign action for frontend use
    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="auto-assign")
    def auto_assign(self, request):
        tasks = request.data.get("tasks") or []
        if not isinstance(tasks, list) or len(tasks) == 0:
            return Response({"detail": "Provide non-empty tasks array under 'tasks'."}, status=status.HTTP_400_BAD_REQUEST)
        if len(tasks) > 25:
            return Response({"detail": "Too many tasks; limit is 25 per request."}, status=status.HTTP_400_BAD_REQUEST)

        candidates = _get_candidate_members(limit=getattr(settings, "OPENAI_MAX_CANDIDATES", 200))

        # fallback deterministic suggestions if OpenAI not configured
        if not OPENAI_AVAILABLE or not getattr(settings, "OPENAI_API_KEY", None):
            out = []
            if not candidates:
                for t in tasks:
                    out.append({"taskId": t.get("id"), "memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates available on server."})
                return Response(out, status=status.HTTP_200_OK)

            for i, t in enumerate(tasks):
                req_dev_type = t.get("developer_type") or t.get("required_developer_type") or None
                if not req_dev_type:
                    pt = (t.get("project_type") or "") or ""
                    pt = str(pt).lower()
                    if "mobile" in pt:
                        req_dev_type = "mobile"
                    elif "ui" in pt or "ux" in pt:
                        req_dev_type = "uiux"
                    elif "web" in pt or "backend" in pt or "frontend" in pt:
                        req_dev_type = "web"

                chosen = self._choose_candidate_fallback({
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                    "required_developer_type": req_dev_type,
                    "min_experience": t.get("min_experience") or t.get("minimum_experience")
                }, candidates)
                out.append({
                    "taskId": t.get("id"),
                    "memberId": chosen.get("memberId"),
                    "memberName": chosen.get("memberName"),
                    "confidence": chosen.get("confidence"),
                    "reason": chosen.get("reason"),
                })
            return Response(out, status=status.HTTP_200_OK)

        # Build payload and call OpenAI if configured
        def infer_task_dev_type(t):
            dt = t.get("developer_type") or t.get("required_developer_type") or None
            if dt:
                return dt
            pt = str((t.get("project_type") or "")).lower()
            if "mobile" in pt:
                return "mobile"
            if "ui" in pt or "ux" in pt:
                return "uiux"
            if "web" in pt or "backend" in pt or "frontend" in pt:
                return "web"
            return None

        payload = {
            "tasks": [
                {
                    "taskId": t.get("id") or t.get("pk") or None,
                    "title": t.get("title") or "",
                    "web_desc": t.get("web_desc") or t.get("description") or "",
                    "mobile_desc": t.get("mobile_desc") or "",
                    "figma_desc": t.get("figma_desc") or "",
                    "tags": t.get("tags") or [],
                    "priority": t.get("priority") or "",
                    "deadline": str(t.get("deadline")) if t.get("deadline") else "",
                    "hours": t.get("hours") or 0,
                    "required_developer_type": infer_task_dev_type(t),
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                } for t in tasks
            ],
            # include a compact candidate list (id, name, skills, experience, developer_type)
            "candidates": [
                {
                    "id": c.get("id"),
                    "user_id": c.get("user_id"),
                    "name": c.get("name"),
                    "skills": c.get("skills"),
                    "experience": c.get("experience"),
                    "developer_type": c.get("developer_type")
                } for c in candidates[: getattr(settings, "OPENAI_MAX_CANDIDATES", 200)]
            ]
        }

        # Strong instruction: choose one memberId from the provided candidates for each task.
        system_msg = "You are an assistant that returns ONLY valid JSON. No additional explanation."
        user_msg = (
            "You are given a list of tasks and a list of candidate members. "
            "For each task you MUST select exactly one candidate `memberId` from the provided `candidates` array. "
            "Do NOT invent ids or names — the `memberId` must be one of the ids present in the 'candidates' list. "
            "Return a JSON array (one element per task) with shape:\n"
            '{ "taskId": <id>, "memberId": <candidate.id - from payload>, "memberName": <string>, "confidence": <0-100>, "reason": <short explanation> }\n\n'
            "Selection rules (apply in order):\n"
            "1) Prefer candidates where `developer_type` matches task.required_developer_type.\n"
            "2) Prefer candidates that match the most required skills (skill overlap).\n"
            "3) Use years of experience as tie-breaker (higher is better).\n"
            "4) If a candidate has zero skill overlap but matches developer_type and has >=5 years experience, you MAY still select them — state this in 'reason'.\n\n"
            "Important constraints:\n"
            "- memberId MUST be one of the candidate ids supplied for this request.\n"
            "- Confidence is 0-100 and must reflect your relative certainty.\n"
            "- Keep 'reason' short (one sentence).\n\n"
            f"Input payload:\n{json.dumps(payload)}"
        )

        try:
            openai.api_key = getattr(settings, "OPENAI_API_KEY", None)
            model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
            resp = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.0,
                max_tokens=getattr(settings, "OPENAI_MAX_TOKENS", 800),
            )
            raw = resp["choices"][0]["message"]["content"]
            parsed = _extract_json_from_text(raw)
            if parsed is None:
                logger.error("Auto-assign: failed to parse model output: %s", raw)
                return Response({"detail": "Failed to parse model response"}, status=status.HTTP_502_BAD_GATEWAY)

            # Validate parsed shape: must be list with entries mapping to tasks and memberId must be in candidate ids
            candidate_ids = {str(c.get("id")) for c in payload.get("candidates", []) if c.get("id") is not None}
            output = []
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                taskId = item.get("taskId")
                memberId = item.get("memberId")
                memberName = item.get("memberName")
                confidence = item.get("confidence")
                reason = item.get("reason")

                # allow ints/strings but coerce to string for membership check
                if memberId is None or str(memberId) not in candidate_ids:
                    # If model returned invalid memberId, attempt to fallback to deterministic choice for that task
                    logger.warning("OpenAI returned invalid memberId for task %s: %s", taskId, memberId)
                    # find original task payload to pass to fallback
                    orig_task = next((t for t in payload["tasks"] if str(t.get("taskId")) == str(taskId)), None)
                    fallback_choice = self._choose_candidate_fallback({
                        "required_skills": orig_task.get("required_skills") if orig_task else [],
                        "required_developer_type": orig_task.get("required_developer_type") if orig_task else None
                    }, candidates)
                    output.append({
                        "taskId": taskId,
                        "memberId": fallback_choice.get("memberId"),
                        "memberName": fallback_choice.get("memberName"),
                        "confidence": fallback_choice.get("confidence"),
                        "reason": (fallback_choice.get("reason") or "fallback due to invalid OpenAI selection"),
                    })
                    continue

                output.append({
                    "taskId": taskId,
                    "memberId": memberId,
                    "memberName": memberName,
                    "confidence": confidence,
                    "reason": reason,
                })
            return Response(output, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Auto-assign failure")
            # fallback deterministic when OpenAI fails
            out = []
            if not candidates:
                for t in tasks:
                    out.append({"taskId": t.get("id"), "memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates available on server."})
                return Response(out, status=status.HTTP_200_OK)

            for t in tasks:
                req_dev_type = t.get("developer_type") or t.get("required_developer_type") or None
                if not req_dev_type:
                    pt = (t.get("project_type") or "") or ""
                    pt = str(pt).lower()
                    if "mobile" in pt:
                        req_dev_type = "mobile"
                    elif "ui" in pt or "ux" in pt:
                        req_dev_type = "uiux"
                    elif "web" in pt or "backend" in pt or "frontend" in pt:
                        req_dev_type = "web"

                chosen = self._choose_candidate_fallback({
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                    "required_developer_type": req_dev_type,
                    "min_experience": t.get("min_experience") or t.get("minimum_experience")
                }, candidates)
                out.append({
                    "taskId": t.get("id"),
                    "memberId": chosen.get("memberId"),
                    "memberName": chosen.get("memberName"),
                    "confidence": chosen.get("confidence"),
                    "reason": chosen.get("reason"),
                })
            return Response(out, status=status.HTTP_200_OK)

    # ---------------- scoring & chooser ----------------
    def _score_candidate(self, task_payload: dict, cand: dict):
        """
        Improved scoring:
         - skills weight: 50
         - experience weight: 30
         - developer_type match: 20 (plus bonus if devType matches)
         - additional small experience bonus for >5yrs
        Special behavior:
         - If there are NO skill matches but the candidate matches developer_type AND has >=5 years experience,
           we give a stronger score (allow assignment even when skills are missing).
        Returns (score:int, reason:str)
        """
        def toks(x):
            if not x:
                return []
            if isinstance(x, list):
                return [str(i).lower().strip() for i in x if i]
            return [s.strip().lower() for s in str(x).split(",") if s.strip()]

        task_skills = toks(task_payload.get("required_skills") or task_payload.get("skills") or task_payload.get("tags") or [])
        cand_skills = toks(cand.get("skills") or cand.get("skill") or "")
        needed = max(1, len(task_skills))  # don't divide by zero

        overlap = 0
        if task_skills:
            overlap = sum(1 for s in task_skills if s in cand_skills)
        # Skill score: proportion of required skills matched scaled to 50
        skill_score = (overlap / needed) * 50 if task_skills else 0

        # Experience score: up to 30 points, capping experience at 20yrs
        try:
            member_exp = float(cand.get("experience") or 0)
        except Exception:
            member_exp = 0.0
        capped = max(0.0, min(20.0, member_exp))
        experience_score = (capped / 20.0) * 30.0

        # Developer type match score (20 if matches)
        req_dev = (task_payload.get("required_developer_type") or task_payload.get("developer_type") or "") or ""
        cand_dev = (cand.get("developer_type") or cand.get("dev_type") or "") or ""
        dev_score = 20 if (str(req_dev).strip() and str(cand_dev).strip() and str(req_dev).lower() == str(cand_dev).lower()) else 0

        # Additional experience bonus for seniority
        exp_bonus = 5 if member_exp >= 8 else (3 if member_exp >= 5 else 0)

        # Special rule: if there are NO task skills specified, reward experience/dev match more (don't penalize)
        if not task_skills:
            # reweight: move skill weight into experience/dev
            experience_score = min(30, experience_score + 10)  # give extra weight to experience
            skill_score = 0

        # NEW: If there is zero skill overlap, but developer type matches and experience is substantial (>=5),
        # allow assigning by boosting score to a reasonable level so fallback chooser will pick them.
        special_case_applied = False
        if task_skills and overlap == 0 and dev_score > 0 and member_exp >= 5:
            # Give a healthy score so candidate can be chosen despite no skill overlap.
            special_case_applied = True
            experience_score = max(experience_score, 25.0)  # ensure a reasonable experience floor

        total = int(round(max(0, min(100, skill_score + experience_score + dev_score + exp_bonus))))
        reason_parts = []
        reason_parts.append(f"skills overlap {overlap}/{needed}")
        reason_parts.append(f"exp {member_exp}yr (+{exp_bonus} bonus)")
        reason_parts.append(f"devType match: {'yes' if dev_score>0 else 'no'}")
        if special_case_applied:
            reason_parts.append("special: no skills but devType+exp match -> allowed")
        reason = "; ".join(reason_parts)
        return total, reason

    def _choose_candidate_fallback(self, task_payload: dict, candidates: list):
        """
        Pick the top candidate by _score_candidate and return dict with meta.
        Will always return the best candidate (no strict rejection).
        """
        best = None
        for cand in candidates:
            score, reason = self._score_candidate(task_payload, cand)
            if best is None or score > best["confidence"]:
                best = {
                    "memberId": cand.get("id"),
                    "memberName": cand.get("name") or cand.get("username") or cand.get("user_name"),
                    "confidence": score,
                    "reason": reason,
                    "meta": cand,
                }
        if best is None:
            return {"memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates"}
        # Ensure memberId is present (coerce to int/str as present in candidate)
        if best.get("memberId") is None and candidates:
            c = candidates[0]
            best["memberId"] = c.get("id")
            best["memberName"] = c.get("name") or c.get("username")
            best["reason"] = f"forced pick {best['memberName']} due to no scoring result"
            best["confidence"] = best.get("confidence") or 0
        return best

    def _choose_candidate_openai(self, task_payload: dict, candidates: list):
        """
        Ask OpenAI to pick a candidate for a single task (same interface as fallback).
        Validation: ensures returned memberId exists in provided candidates.
        """
        if not OPENAI_AVAILABLE or not getattr(settings, "OPENAI_API_KEY", None):
            raise RuntimeError("OpenAI not available/configured")

        openai.api_key = getattr(settings, "OPENAI_API_KEY", None)
        model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        max_tokens = getattr(settings, "OPENAI_MAX_TOKENS", 400)

        payload = {
            "task": {
                "taskId": task_payload.get("taskId") or task_payload.get("id"),
                "title": task_payload.get("title") or "",
                "desc": task_payload.get("web_desc") or task_payload.get("description") or "",
                "required_developer_type": task_payload.get("required_developer_type") or task_payload.get("developer_type") or None,
                "required_skills": task_payload.get("required_skills") or task_payload.get("skills") or task_payload.get("tags") or [],
                "priority": task_payload.get("priority") or "",
            },
            "candidates": candidates[: getattr(settings, "OPENAI_MAX_CANDIDATES", 200)]
        }

        system_msg = "You are an assistant that returns ONLY valid JSON. No commentary."
        user_msg = (
            "Given one task and a list of candidate members (with id, name, skills, experience, developer_type), "
            "choose the most suitable member and return JSON: "
            '{"memberId": <id|null>, "memberName": <string|null>, "confidence": <0-100>, "reason": <short explanation> }\n\n'
            "Important: You MUST choose a memberId that exists in the provided 'candidates' list. "
            "Do not invent IDs. If no clear match exists, choose the candidate with the highest experience. "
            "If a candidate has no skill overlap but does match developer_type and has >=5 years experience, you MAY choose them — state this explicitly.\n\n"
            f"Input:\n{json.dumps(payload)}"
        )

        resp = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.0,
            max_tokens=max_tokens,
        )
        raw = resp["choices"][0]["message"]["content"]
        parsed = _extract_json_from_text(raw)
        if not parsed:
            raise RuntimeError(f"OpenAI returned unparsable response: {raw}")

        # Accept list or single object
        obj = parsed[0] if isinstance(parsed, list) and parsed else parsed if isinstance(parsed, dict) else None
        if not obj:
            raise RuntimeError("OpenAI did not return object result")

        # Validate memberId is among candidates
        candidate_ids = {str(c.get("id")) for c in candidates if c.get("id") is not None}
        mid = obj.get("memberId") or obj.get("member_id") or obj.get("id")
        if mid is None or str(mid) not in candidate_ids:
            raise RuntimeError(f"OpenAI returned invalid memberId: {mid}; must be one of {candidate_ids}")

        # attempt to find the candidate dict for meta
        chosen_candidate = next((c for c in candidates if str(c.get("id")) == str(mid)), None)

        return {
            "memberId": mid,
            "memberName": obj.get("memberName") or obj.get("member_name") or (chosen_candidate and chosen_candidate.get("name")),
            "confidence": int(obj.get("confidence") or obj.get("score") or 0),
            "reason": obj.get("reason") or obj.get("explanation") or "",
            "meta": {"raw": raw, "parsed": obj, "candidate": chosen_candidate},
        }

    # Resolve candidate to auth.User conservatively (aggressive heuristics kept)
    def _resolve_candidate_to_user(self, chosen_member_id, chosen_member_name, candidates):
        diag = {"chosen_member_id": chosen_member_id, "chosen_member_name": chosen_member_name, "steps": []}
        # 0) scan candidate entry for user_id
        for c in (candidates or []):
            try:
                if c.get("id") is not None and chosen_member_id is not None and str(c.get("id")) == str(chosen_member_id):
                    diag["steps"].append(f"candidate entry matched id={chosen_member_id}")
                    uid = c.get("user_id") or (c.get("user") and c.get("user").get("id"))
                    if uid:
                        diag["steps"].append(f"candidate provided user_id={uid}; trying User(pk={uid})")
                        u = User.objects.filter(pk=uid).first()
                        if u:
                            diag["resolved_by"] = "candidate.user_id"
                            return u, diag
            except Exception:
                logger.exception("resolve step candidate entry failed")
                diag["steps"].append("exception in candidate entry step")

        # 1) try direct User(pk=chosen_member_id)
        if chosen_member_id is not None:
            try:
                diag["steps"].append(f"trying User(pk={chosen_member_id})")
                u = User.objects.filter(pk=chosen_member_id).first()
                if u:
                    diag["resolved_by"] = "direct_user_pk"
                    return u, diag
            except Exception:
                logger.exception("resolve step direct user pk failed")
                diag["steps"].append("exception in direct pk step")

        # 2) try Member(pk=chosen_member_id).user
        try:
            Member = apps.get_model("members", "Member")
        except Exception:
            Member = None
        if Member and chosen_member_id is not None:
            try:
                diag["steps"].append(f"trying Member(pk={chosen_member_id}).user")
                member = Member.objects.filter(pk=chosen_member_id).select_related("user").first()
                if member and getattr(member, "user", None):
                    diag["resolved_by"] = "member.user_by_pk"
                    return member.user, diag
                elif member:
                    diag["steps"].append("Member found but has no user")
            except Exception:
                logger.exception("resolve step Member.pk failed")
                diag["steps"].append("exception in member.pk step")

        # 3) scan all candidate entries for 'user_id'
        for c in (candidates or []):
            try:
                uid = c.get("user_id") or (c.get("user") and c.get("user").get("id"))
                if uid:
                    diag["steps"].append(f"candidate list user_id={uid}; trying User(pk={uid})")
                    u = User.objects.filter(pk=uid).first()
                    if u:
                        diag["resolved_by"] = "candidate_list_user_id"
                        return u, diag
            except Exception:
                logger.exception("resolve step scanning candidates failed")
                diag["steps"].append("exception scanning candidates")

        # 4) try exact username/email match
        if chosen_member_name:
            try:
                uname = str(chosen_member_name).strip()
                diag["steps"].append(f"trying exact username/email '{uname}'")
                u = User.objects.filter(username__iexact=uname).first()
                if u:
                    diag["resolved_by"] = "username_exact"
                    return u, diag
                u = User.objects.filter(email__iexact=uname).first()
                if u:
                    diag["resolved_by"] = "email_exact"
                    return u, diag
            except Exception:
                logger.exception("resolve step exact match failed")

        # 5) fuzzy username contains
        if chosen_member_name:
            parts = [p.strip() for p in re.split(r"[\s,_\-\.\s]+", chosen_member_name) if p.strip()]
            for p in parts:
                if len(p) < 2:
                    continue
                try:
                    diag["steps"].append(f"trying username__icontains='{p}'")
                    u = User.objects.filter(username__icontains=p).first()
                    if u:
                        diag["resolved_by"] = "username_contains"
                        return u, diag
                except Exception:
                    logger.exception("resolve step fuzzy contains failed")

        diag["steps"].append("no resolution found")
        return None, diag
    
    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="stats")
    
    def stats(self, request):
        total_created = TaskAI.objects.filter(created_by=request.user).count()
        return Response({"total_created": total_created}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="created")
    def created(self, request):
        qs = TaskAI.objects.filter(created_by=request.user).order_by("-created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


    def _auto_assign_task_instance(self, task: TaskAI):
        """
        Build task payload -> pick candidate (OpenAI if available, else fallback) -> attempt resolve and assign.
        Store diagnostics in task.ai_meta and persist. Create Notification if assignment succeeded.
        """
        task_payload = {
            "taskId": getattr(task, "id", None),
            "title": getattr(task, "title", "") or "",
            "web_desc": getattr(task, "web_desc", "") or "",
            "mobile_desc": getattr(task, "mobile_desc", "") or "",
            "figma_desc": getattr(task, "figma_desc", "") or "",
            "tags": getattr(task, "tags", []) or [],
            "priority": getattr(task, "priority", "") or "",
            "deadline": str(getattr(task, "deadline")) if getattr(task, "deadline", None) else "",
            "hours": getattr(task, "hours", 0) or 0,
            "required_developer_type": getattr(task, "project_type", None) or getattr(task, "developer_type", None) or None,
            "required_skills": getattr(task, "extra", {}).get("required_skills") if isinstance(getattr(task, "extra", None), dict) else [],
        }

        candidates = _get_candidate_members(limit=getattr(settings, "OPENAI_MAX_CANDIDATES", 200))
        if not candidates:
            logger.info("Auto-assign: no candidates found")
            return None

        chosen = None
        try:
            if OPENAI_AVAILABLE and getattr(settings, "OPENAI_API_KEY", None):
                try:
                    chosen = self._choose_candidate_openai(task_payload, candidates)
                except Exception:
                    logger.exception("OpenAI selection failed for single task; falling back to deterministic")
                    chosen = None
        except Exception:
            logger.exception("OpenAI selection general failure")
            chosen = None

        if not chosen:
            chosen = self._choose_candidate_fallback(task_payload, candidates)

        if not isinstance(chosen, dict):
            chosen = {"memberId": None, "memberName": None, "confidence": 0, "reason": "no candidate", "meta": None}

        # Attempt to resolve chosen candidate to a User
        user_obj, diag = self._resolve_candidate_to_user(chosen.get("memberId"), chosen.get("memberName"), candidates)

        # persist metadata regardless
        task.ai_suggested = True
        task.ai_confidence = int(chosen.get("confidence") or 0)
        task.ai_reason = chosen.get("reason") or (diag.get("steps")[0] if diag.get("steps") else "")
        task.ai_meta = {"chosen": chosen, "diag": diag}

        # Lock assignment if model supports it
        if hasattr(task, "assignment_locked"):
            try:
                task.assignment_locked = True
            except Exception:
                logger.exception("failed to set assignment_locked flag")

        if user_obj:
            # assign and persist
            task.assignee = user_obj
            task.assigned_by = getattr(task, "created_by", None) or None
            task.assigned_at = timezone.now()
            try:
                task.save()
                logger.info("Auto-assigned Task %s -> User %s (conf=%s)", task.pk, user_obj.pk, task.ai_confidence)
            except Exception:
                logger.exception("Failed to save TaskAI after auto-assign")
                # fallback: attempt direct update
                try:
                    TaskAI.objects.filter(pk=task.pk).update(
                        assignee_id=user_obj.pk,
                        assigned_by_id=(getattr(task, "created_by_id", None) or None),
                        assigned_at=timezone.now(),
                        ai_suggested=True,
                        ai_confidence=task.ai_confidence,
                        ai_reason=task.ai_reason,
                        ai_meta=task.ai_meta,
                        **({"assignment_locked": True} if hasattr(task, "assignment_locked") else {})
                    )
                except Exception:
                    logger.exception("Fallback update also failed for auto-assign")

            # create notification if Notification model exists
            try:
                Notification = apps.get_model("timesheet", "Notification")
                Notification.objects.create(
                    recipient_id=user_obj.pk,
                    verb=f"You have been assigned to task: {task.title or task.pk}",
                    task_id=task.pk,
                )
            except Exception:
                logger.exception("Failed to create Notification for auto-assigned task %s", task.pk)

            return user_obj

        # No resolved user — still persist ai metadata
        try:
            task.save()
        except Exception:
            logger.exception("Failed to save TaskAI with ai_meta when no user resolved")
        logger.info("Auto-assign did not resolve a User for Task %s; diag=%s", task.pk, diag)
        return None
    
    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="reviews")
    def reviews(self, request, pk=None):
        """
        List reviews for this task.
        """
        try:
            task = TaskAI.objects.get(pk=pk)
        except TaskAI.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = TaskReview.objects.filter(task=task).order_by("-created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = TaskReviewSerializer(page, many=True, context={"request": request, "task": task})
            return self.get_paginated_response(ser.data)

        ser = TaskReviewSerializer(qs, many=True, context={"request": request, "task": task})
        return Response(ser.data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="reviews")
    def create_review(self, request, pk=None):
        """
        Create a review for this task. Reviewer is taken from request.user -> Member.
        Expected payload: { "text": "...", "rating": 4 }
        """
        try:
            task = TaskAI.objects.get(pk=pk)
        except TaskAI.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TaskReviewSerializer(data=request.data, context={"request": request, "task": task})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        # Update member aggregates on the MEMBER WHO WAS REVIEWED.
        # Decide which Member to update: often you review the assignee (task.assignee.member_profile)
        reviewed_member = None
        if getattr(task, "assignee", None):
            try:
                reviewed_member = Member.objects.get(user=task.assignee)
            except Member.DoesNotExist:
                reviewed_member = None

        # If there's a reviewed_member and you've added aggregate fields to Member, update them
        if reviewed_member:
            # Recompute aggregates from TaskReview objects that point to tasks assigned to this member
            # Example: average rating across all reviews for tasks where task.assignee == that member's user
            # You can change aggregation scope as desired.
            from django.db.models import Avg, Count
            agg = TaskReview.objects.filter(task__assignee=reviewed_member.user, rating__isnull=False).aggregate(avg=Avg("rating"), cnt=Count("id"))
            avg_rating = agg["avg"] or 0.0
            cnt = agg["cnt"] or 0
            # Only update if Member model has these fields (optional)
            if hasattr(reviewed_member, "avg_rating"):
                reviewed_member.avg_rating = float(avg_rating)
            if hasattr(reviewed_member, "review_count"):
                reviewed_member.review_count = int(cnt)
            if hasattr(reviewed_member, "last_reviewed_at"):
                reviewed_member.last_reviewed_at = review.created_at
            reviewed_member.save(update_fields=[f for f in ("avg_rating", "review_count", "last_reviewed_at") if hasattr(reviewed_member, f)])

        out_ser = TaskReviewSerializer(review, context={"request": request, "task": task})
        return Response(out_ser.data, status=status.HTTP_201_CREATED)
