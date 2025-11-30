# views.py
import json
import re
import logging
import random

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


def _get_candidate_members(limit=200):
    """
    Defensive candidate loader returning compact dicts:
      { id, user_id (if present), name, email, skills, experience, developer_type, role, raw, current_load }

    Robust skill extraction: checks several potential fields and normalizes.
    """
    candidates = []
    # Try Member model
    try:
        MemberModel = apps.get_model("members", "Member")
    except Exception:
        MemberModel = None

    if MemberModel is not None:
        try:
            qs = MemberModel.objects.filter(is_active=True).select_related("user")[:limit]
            for m in qs:
                user = getattr(m, "user", None)
                user_id = getattr(user, "id", None) if user else None
                email = getattr(user, "email", None) if user else None
                # gather skills from multiple possible fields
                skills = getattr(m, "skills", None) or getattr(m, "skillset", None) or getattr(m, "expertise", None) or ""
                if isinstance(skills, (list, tuple)):
                    skills = ",".join([str(s) for s in skills])
                experience = getattr(m, "experience", None) or getattr(m, "years_experience", None) or 0
                devtype = getattr(m, "developer_type", None) or getattr(m, "dev_type", None) or getattr(m, "type", None)
                name = (
                    (getattr(user, "get_full_name", None) and user.get_full_name())
                    or getattr(user, "username", None)
                    or getattr(m, "username", None)
                    or getattr(m, "full_name", None)
                    or str(m)
                )
                candidates.append({
                    "id": getattr(m, "id", None),
                    "user_id": user_id,
                    "name": name,
                    "email": email,
                    "skills": skills or "",
                    "experience": experience or 0,
                    "role": getattr(m, "role", "") or "",
                    "developer_type": devtype,
                    "raw": {"member_pk": getattr(m, "pk", None), "source": "members.Member"},
                })
        except Exception:
            logger.exception("Error reading members.Member - falling back to auth.User")

    # Append auth.User fallback
    try:
        qs = User.objects.filter(is_active=True)[:limit]
        for u in qs:
            profile = getattr(u, "profile", None)
            skills = None
            if profile:
                skills = getattr(profile, "skills", None) or getattr(profile, "skillset", None) or getattr(profile, "expertise", None)
            if not skills:
                skills = getattr(u, "skills", None) or getattr(u, "skillset", None) or ""
            if isinstance(skills, (list, tuple)):
                skills = ",".join([str(s) for s in skills])
            experience = getattr(profile, "experience", None) if profile else getattr(u, "experience", None)
            experience = experience or 0
            devtype = (getattr(profile, "developer_type", None) if profile else None) or getattr(u, "developer_type", None) or getattr(u, "dev_type", None)
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
                "raw": {"user_pk": getattr(u, "pk", None), "source": "auth.User"},
            })
    except Exception:
        logger.exception("Error reading auth.User for candidates")

    # Dedupe by user_id or id (prefer higher experience)
    dedup = {}
    for c in candidates:
        key = c.get("user_id") or c.get("id")
        if key is None:
            continue
        key = str(key)
        existing = dedup.get(key)
        try:
            cur_exp = float(c.get("experience") or 0)
        except Exception:
            cur_exp = 0.0
        if not existing:
            dedup[key] = c
        else:
            try:
                existing_exp = float(existing.get("experience") or 0)
            except Exception:
                existing_exp = 0.0
            if cur_exp > existing_exp:
                dedup[key] = c

    final = []
    for key, c in dedup.items():
        try:
            uid = int(key)
            load = TaskAI.objects.filter(assignee_id=uid).count()
        except Exception:
            load = 0
        c["current_load"] = load
        final.append(c)

    if not final:
        # fallback: decorate original list if dedupe removed all
        for c in candidates:
            key = c.get("user_id") or c.get("id")
            try:
                uid = int(key) if key is not None else None
                load = TaskAI.objects.filter(assignee_id=uid).count() if uid else 0
            except Exception:
                load = 0
            c["current_load"] = load
        return candidates[:limit]

    # sort by experience desc (heuristic)
    final.sort(key=lambda x: float(x.get("experience") or 0), reverse=True)
    return final[:limit]

class TaskAIViewSet(viewsets.ModelViewSet):
    queryset = TaskAI.objects.all()
    serializer_class = TaskAISerializer
    # NOTE: relaxed to AllowAny per your request (no permission gating)
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "web_desc", "mobile_desc", "figma_desc", "tags"]
    ordering_fields = ["deadline", "created_at", "priority"]

    # small helpers
    @staticmethod
    def _as_bool(value):
        if isinstance(value, bool):
            return value
        if value is None:
            return False
        return str(value).strip().lower() in ("1", "true", "yes", "y", "on")

    @staticmethod
    def infer_task_dev_type(t):
        raw = None
        tags = []
        if isinstance(t, dict):
            raw = t.get("developer_type") or t.get("required_developer_type") or t.get("project_type") or ""
            tags = t.get("tags") or []
        else:
            raw = t or ""
        raw_s = str(raw).strip().lower()
        if raw_s in ("mobile", "android", "ios"):
            return "mobile"
        if raw_s in ("web", "backend", "frontend", "fullstack"):
            return "web"
        if raw_s in ("ui", "ux", "uiux", "design"):
            return "uiux"
        try:
            tag_str = " ".join([str(x).lower() for x in (tags or [])])
            if "mobile" in tag_str:
                return "mobile"
            if "ui" in tag_str or "ux" in tag_str or "design" in tag_str:
                return "uiux"
            if "web" in tag_str or "backend" in tag_str or "frontend" in tag_str:
                return "web"
        except Exception:
            pass
        return None

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if getattr(user, "is_staff", False):
            return qs
        try:
            user_projects = user.project_set.all()
            return qs.filter(Q(created_by=user) | Q(assignee=user) | Q(project__in=user_projects)).distinct()
        except Exception:
            return qs.filter(Q(created_by=user) | Q(assignee=user)).distinct()

    def perform_create(self, serializer):
        task = serializer.save()
        try:
            already_assigned = getattr(task, "assignee", None) is not None
            already_ai_suggested = bool(getattr(task, "ai_suggested", False))
            if not already_assigned and not already_ai_suggested:
                self._auto_assign_task_instance(task)
            else:
                logger.debug("Skipping auto-assign: assigned=%s ai_suggested=%s", already_assigned, already_ai_suggested)
        except Exception:
            logger.exception("Auto-assign on create failed (continuing)")

    def perform_update(self, serializer):
        """
        Persist updates; if assignee changed to a user instance, ensure that user is assigned to the project
        (mirrors behavior of perform_create -> assign_user_to_project).
        Also sets assigned_at/assigned_by where appropriate.
        """
        # capture previous state before saving
        try:
            before = self.get_object()
        except Exception:
            before = None

        task = serializer.save()

        # If assignee changed, attempt to ensure project membership and set assignment metadata
        try:
            if before is None or getattr(before, "assignee", None) != getattr(task, "assignee", None):
                new_assignee = getattr(task, "assignee", None)
                if new_assignee:
                    # attempt to add user to project membership (defensive)
                    try:
                        # import here to avoid circular import issues if any
                        from projects.views import assign_user_to_project
                        assign_user_to_project(getattr(task, "project", None), new_assignee)
                    except Exception:
                        logger.exception("assign_user_to_project failed in perform_update")

                    # set assignment metadata if model has fields
                    try:
                        # if assigned_at/assigned_by exist, set them if not present
                        if hasattr(task, "assigned_at"):
                            task.assigned_at = getattr(task, "assigned_at", timezone.now()) or timezone.now()
                        if hasattr(task, "assigned_by") and (not getattr(task, "assigned_by", None)):
                            # prefer created_by if present, else leave as-is
                            task.assigned_by = getattr(task, "created_by", None) or getattr(task, "assigned_by", None)
                        # persist minimal fields
                        update_fields = []
                        if hasattr(task, "assigned_at"):
                            update_fields.append("assigned_at")
                        if hasattr(task, "assigned_by"):
                            update_fields.append("assigned_by")
                        if update_fields:
                            try:
                                task.save(update_fields=update_fields)
                            except Exception:
                                # fallback to full save
                                try:
                                    task.save()
                                except Exception:
                                    logger.exception("Failed to save assignment metadata after update")
                    except Exception:
                        logger.exception("Failed setting assignment metadata in perform_update")
        except Exception:
            logger.exception("perform_update post-save actions failed")

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def assign(self, request, pk=None):
        task = self.get_object()
        allowed = request.user.is_staff or (task.created_by is not None and task.created_by == request.user) or (task.created_by is None and getattr(request.user, "is_authenticated", False))
        if not allowed:
            return Response({"detail": "Not allowed. Only staff or the task creator may assign tasks."}, status=status.HTTP_403_FORBIDDEN)

        locked = bool(getattr(task, "assignment_locked", False)) or bool(getattr(task, "ai_suggested", False))
        force_override = self._as_bool(request.data.get("force", False))
        if locked and not getattr(request.user, "is_staff", False) and not force_override:
            return Response({"detail": "Task is locked from reassignment (AI-assigned). Contact staff to override."}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get("assignee_id")
        if not assignee_id:
            return Response({"detail": "assignee_id required"}, status=status.HTTP_400_BAD_REQUEST)

        assignee = None
        try:
            assignee = User.objects.get(pk=assignee_id)
        except Exception:
            try:
                MemberModel = apps.get_model("members", "Member")
            except Exception:
                MemberModel = None
            if MemberModel is not None:
                try:
                    member = MemberModel.objects.select_related("user").filter(pk=assignee_id).first()
                    if member and getattr(member, "user", None):
                        assignee = member.user
                except Exception:
                    logger.exception("Failed resolving Member(pk=%s) during assign", assignee_id)

        if not assignee:
            return Response({"detail": "assignee not found"}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        update_values = {"assignee_id": assignee.pk, "assigned_by_id": request.user.pk if getattr(request.user, "is_authenticated", False) else None, "assigned_at": now}

        if "ai_suggested" in request.data:
            update_values["ai_suggested"] = self._as_bool(request.data.get("ai_suggested"))
        if "ai_confidence" in request.data:
            try:
                update_values["ai_confidence"] = int(request.data.get("ai_confidence")) if request.data.get("ai_confidence") is not None else None
            except (ValueError, TypeError):
                return Response({"detail": "ai_confidence must be integer 0-100"}, status=status.HTTP_400_BAD_REQUEST)
        if "ai_reason" in request.data:
            update_values["ai_reason"] = request.data.get("ai_reason")
        if "ai_meta" in request.data:
            update_values["ai_meta"] = request.data.get("ai_meta")

        if getattr(request.user, "is_staff", False) and self._as_bool(request.data.get("force", False)):
            if hasattr(task, "assignment_locked"):
                update_values["assignment_locked"] = False
            else:
                update_values["ai_suggested"] = False

        if self._as_bool(request.data.get("ai_suggested", False)) or bool(getattr(task, "ai_suggested", False)):
            if hasattr(task, "assignment_locked"):
                update_values["assignment_locked"] = True

        try:
            TaskAI.objects.filter(pk=task.pk).update(**update_values)
            logger.info("Assign update: task %s set assignee_id=%s by user %s", task.pk, assignee.pk, getattr(request.user, "pk", None))
        except Exception:
            logger.exception("Assign update failed for task %s", task.pk)
            return Response({"detail": "Failed to persist assignment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        fresh = TaskAI.objects.filter(pk=task.pk).select_related("assignee", "assigned_by").first()

        try:
            Notification = apps.get_model("timesheet", "Notification")
            try:
                Notification.objects.create(recipient_id=fresh.assignee_id, verb=f"You have been assigned to task: {fresh.title or fresh.pk}", task_id=fresh.pk)
                logger.info("Notification created for user %s about task %s", fresh.assignee_id, fresh.pk)
            except Exception:
                logger.exception("Failed creating Notification row for task %s", fresh.pk)
        except Exception:
            logger.debug("Notification model timesheet.Notification not found; skipping notification creation.")

        serializer = self.get_serializer(fresh)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def my(self, request):
        user = request.user
        qs = self.get_queryset().filter(Q(created_by=user) | Q(assignee=user)).distinct()

        extra_task_pks = []
        try:
            MemberModel = apps.get_model("members", "Member")
        except Exception:
            MemberModel = None

        if MemberModel is not None:
            try:
                user_member = MemberModel.objects.filter(user=user).first()
            except Exception:
                user_member = None

            if user_member:
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

        if extra_task_pks:
            qs = qs | TaskAI.objects.filter(pk__in=extra_task_pks)

        page = self.paginate_queryset(qs.distinct())
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs.distinct(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny], url_path="auto-assign")
    def auto_assign(self, request):
        tasks = request.data.get("tasks") or []
        if not isinstance(tasks, list) or len(tasks) == 0:
            return Response({"detail": "Provide non-empty tasks array under 'tasks'."}, status=status.HTTP_400_BAD_REQUEST)
        if len(tasks) > 25:
            return Response({"detail": "Too many tasks; limit is 25 per request."}, status=status.HTTP_400_BAD_REQUEST)

        candidates = _get_candidate_members(limit=getattr(settings, "OPENAI_MAX_CANDIDATES", 200))
        logger.debug("Auto-assign invoked: %d tasks, %d distinct candidates", len(tasks), len(candidates))

        run_assigned_counts = {}

        # fallback deterministic suggestions if OpenAI not configured
        if not OPENAI_AVAILABLE or not getattr(settings, "OPENAI_API_KEY", None):
            out = []
            if not candidates:
                for t in tasks:
                    out.append({"taskId": t.get("id"), "memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates available on server."})
                return Response(out, status=status.HTTP_200_OK)
            for t in tasks:
                req_dev_type = self.infer_task_dev_type(t)
                chosen = self._choose_candidate_fallback({
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                    "required_developer_type": req_dev_type,
                    "min_experience": t.get("min_experience") or t.get("minimum_experience")
                }, candidates, assigned_counts=run_assigned_counts)
                out.append({"taskId": t.get("id"), "memberId": chosen.get("memberId"), "memberName": chosen.get("memberName"), "confidence": chosen.get("confidence"), "reason": chosen.get("reason")})
                mid = chosen.get("memberId")
                if mid is not None:
                    run_assigned_counts[str(mid)] = run_assigned_counts.get(str(mid), 0) + 1
            return Response(out, status=status.HTTP_200_OK)

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
                    "required_developer_type": self.infer_task_dev_type(t),
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                } for t in tasks
            ],
            "candidates": [
                {"id": c.get("id"), "user_id": c.get("user_id"), "name": c.get("name"), "skills": c.get("skills"), "experience": c.get("experience"), "developer_type": c.get("developer_type")}
                for c in candidates[: getattr(settings, "OPENAI_MAX_CANDIDATES", 200)]
            ]
        }

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
            "Additional rule: If multiple candidates are suitable across tasks, try to distribute assignments rather than picking the same person for every task. "
            "Do not return the exact same memberId for more than 3 tasks in this request unless they are clearly the only best fit.\n\n"
            f"Input payload:\n{json.dumps(payload)}"
        )

        try:
            openai.api_key = getattr(settings, "OPENAI_API_KEY", None)
            model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
            resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}],
                temperature=0.0,
                max_tokens=getattr(settings, "OPENAI_MAX_TOKENS", 800),
            )
            raw = resp["choices"][0]["message"]["content"]
            parsed = _extract_json_from_text(raw)
            if parsed is None:
                logger.error("Auto-assign: failed to parse model output: %s", raw)
                return Response({"detail": "Failed to parse model response"}, status=status.HTTP_502_BAD_GATEWAY)

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

                if memberId is None or str(memberId) not in candidate_ids:
                    logger.warning("OpenAI returned invalid memberId for task %s: %s", taskId, memberId)
                    orig_task = next((t for t in payload["tasks"] if str(t.get("taskId")) == str(taskId)), None)
                    fallback_choice = self._choose_candidate_fallback({
                        "required_skills": orig_task.get("required_skills") if orig_task else [],
                        "required_developer_type": orig_task.get("required_developer_type") if orig_task else None
                    }, candidates, assigned_counts=run_assigned_counts)
                    fallback_choice.setdefault("meta", {}).update({"raw_openai": raw, "parsed_openai": parsed})
                    output.append({
                        "taskId": taskId,
                        "memberId": fallback_choice.get("memberId"),
                        "memberName": fallback_choice.get("memberName"),
                        "confidence": fallback_choice.get("confidence"),
                        "reason": (fallback_choice.get("reason") or "fallback due to invalid OpenAI selection"),
                    })
                    mid = fallback_choice.get("memberId")
                    if mid is not None:
                        run_assigned_counts[str(mid)] = run_assigned_counts.get(str(mid), 0) + 1
                    continue

                output.append({"taskId": taskId, "memberId": memberId, "memberName": memberName, "confidence": confidence, "reason": reason})
                run_assigned_counts[str(memberId)] = run_assigned_counts.get(str(memberId), 0) + 1

            return Response(output, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Auto-assign failure - falling back deterministic")
            out = []
            if not candidates:
                for t in tasks:
                    out.append({"taskId": t.get("id"), "memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates available on server."})
                return Response(out, status=status.HTTP_200_OK)
            for t in tasks:
                req_dev_type = self.infer_task_dev_type(t)
                chosen = self._choose_candidate_fallback({
                    "required_skills": t.get("required_skills") or t.get("skills") or t.get("tags") or [],
                    "required_developer_type": req_dev_type,
                    "min_experience": t.get("min_experience") or t.get("minimum_experience")
                }, candidates, assigned_counts=run_assigned_counts)
                out.append({"taskId": t.get("id"), "memberId": chosen.get("memberId"), "memberName": chosen.get("memberName"), "confidence": chosen.get("confidence"), "reason": chosen.get("reason")})
                mid = chosen.get("memberId")
                if mid is not None:
                    run_assigned_counts[str(mid)] = run_assigned_counts.get(str(mid), 0) + 1
            return Response(out, status=status.HTTP_200_OK)

    # scoring and chooser
    def _score_candidate(self, task_payload: dict, cand: dict):
        def toks(x):
            if not x:
                return []
            if isinstance(x, list):
                return [str(i).lower().strip() for i in x if i]
            return [s.strip().lower() for s in str(x).split(",") if s.strip()]

        task_skills = toks(task_payload.get("required_skills") or task_payload.get("skills") or task_payload.get("tags") or [])
        cand_skills = toks(cand.get("skills") or cand.get("skill") or "")
        needed = max(1, len(task_skills))
        overlap = 0
        if task_skills:
            overlap = sum(1 for s in task_skills if s in cand_skills)

        # skill score (cap)
        skill_score = min(60, (overlap * 15))
        try:
            member_exp = float(cand.get("experience") or 0)
        except Exception:
            member_exp = 0.0
        capped = max(0.0, min(20.0, member_exp))
        experience_score = (capped / 20.0) * 25.0

        req_dev = (task_payload.get("required_developer_type") or task_payload.get("developer_type") or "") or ""
        cand_dev = (cand.get("developer_type") or cand.get("dev_type") or "") or ""
        dev_score = 15 if (str(req_dev).strip() and str(cand_dev).strip() and str(req_dev).lower() == str(cand_dev).lower()) else 0

        exp_bonus = 5 if member_exp >= 8 else (3 if member_exp >= 5 else 0)

        special_case_applied = False
        if task_skills and overlap == 0:
            if dev_score > 0 and member_exp >= 5:
                special_case_applied = True
                experience_score = max(experience_score, 18.0)
            else:
                experience_score = max(0.0, experience_score - 10.0)

        base_total = int(round(max(0, min(100, skill_score + experience_score + dev_score + exp_bonus))))

        try:
            cur_load = int(cand.get("current_load") or 0)
        except Exception:
            cur_load = 0
        load_penalty = min(20, cur_load * 5)
        total = max(0, base_total - load_penalty)
        reason_parts = [f"skills {overlap}/{needed}", f"exp {member_exp}yr", f"devType:{'yes' if dev_score>0 else 'no'}", f"load:{cur_load}(-{load_penalty})"]
        if special_case_applied:
            reason_parts.append("special: devType+exp fallback")
        reason = "; ".join(reason_parts)
        return total, reason, overlap

    def _choose_candidate_fallback(self, task_payload: dict, candidates: list, assigned_counts: dict = None):
        """
        Non-deterministic fallback:
        - score candidates
        - take top candidates within score window (default 3 points)
        - further prefer candidates with the smallest current_load and smallest assigned_counts
        - randomly pick among the best subset to avoid always picking the same member
        """
        if assigned_counts is None:
            assigned_counts = {}

        scored = []
        for cand in candidates:
            score, reason, overlap = self._score_candidate(task_payload, cand)
            prior = assigned_counts.get(str(cand.get("id")), 0)
            run_penalty = prior * 8  # stronger penalty so run diversity matters
            adjusted = max(0, score - run_penalty)
            scored.append({"candidate": cand, "score": score, "adjusted": adjusted, "reason": reason, "overlap": overlap})

        if not scored:
            return {"memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates"}

        # primary sort by adjusted desc, overlap desc, experience desc
        def keyfn(item):
            exp = float(item["candidate"].get("experience") or 0)
            return (-item["adjusted"], -item["overlap"], -exp, int(item["candidate"].get("id") or 0))

        scored.sort(key=keyfn)
        best = scored[0]
        top_score = best["adjusted"]

        # build top group: within 3 points AND not massively penalized by load
        top_group = [s for s in scored if (top_score - s["adjusted"]) <= 3]
        # further filter by minimal current_load
        if top_group:
            min_load = min(int(s["candidate"].get("current_load") or 0) for s in top_group)
            top_group = [s for s in top_group if int(s["candidate"].get("current_load") or 0) == min_load] or top_group

        # further prefer those with smaller assigned_counts in this run
        if top_group:
            min_assigned = min(assigned_counts.get(str(s["candidate"].get("id")), 0) for s in top_group)
            top_group = [s for s in top_group if assigned_counts.get(str(s["candidate"].get("id")), 0) == min_assigned] or top_group

        # Randomly choose one from top_group to avoid deterministic bias
        chosen_item = random.choice(top_group) if len(top_group) > 1 else best
        cand = chosen_item["candidate"]

        # Ensure cand.id exists
        if cand.get("id") is None:
            # forced pick
            if candidates:
                cand = candidates[0]
                return {"memberId": cand.get("id"), "memberName": cand.get("name") or cand.get("username"), "confidence": 0, "reason": "forced pick due to missing id", "meta": cand}
            return {"memberId": None, "memberName": None, "confidence": 0, "reason": "No candidates"}

        conf = int(max(0, min(100, chosen_item["adjusted"])))
        return {"memberId": cand.get("id"), "memberName": cand.get("name") or cand.get("username") or cand.get("user_name"), "confidence": conf, "reason": chosen_item["reason"], "meta": cand}

    def _choose_candidate_openai(self, task_payload: dict, candidates: list):
        """
        Same robust OpenAI handling as before; if model returns null/invalid memberId we fall back to the
        non-deterministic chooser above.
        """
        if not OPENAI_AVAILABLE or not getattr(settings, "OPENAI_API_KEY", None):
            return self._choose_candidate_fallback(task_payload, candidates)

        try:
            openai.api_key = getattr(settings, "OPENAI_API_KEY", None)
            model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
            max_tokens = getattr(settings, "OPENAI_MAX_TOKENS", 400)
            payload = {"task": {"taskId": task_payload.get("taskId") or task_payload.get("id"), "title": task_payload.get("title") or "", "desc": task_payload.get("web_desc") or task_payload.get("description") or "", "required_developer_type": task_payload.get("required_developer_type") or task_payload.get("developer_type") or None, "required_skills": task_payload.get("required_skills") or task_payload.get("skills") or task_payload.get("tags") or [], "priority": task_payload.get("priority") or ""}, "candidates": candidates[: getattr(settings, "OPENAI_MAX_CANDIDATES", 200)]}
            system_msg = "You are an assistant that returns ONLY valid JSON. No commentary."
            user_msg = ("Given one task and a list of candidate members (with id, name, skills, experience, developer_type), choose the most suitable member and return JSON: " '{"memberId": <id|null>, "memberName": <string|null>, "confidence": <0-100>, "reason": <short explanation> }' "Important: memberId MUST be exactly one of the ids present in the provided 'candidates' array. Return memberId as a plain integer (not words). If you cannot pick one of the candidate ids, set memberId to null and include an explanation in 'reason'.\n\nExample output (single object):\n" '{"memberId": 5, "memberName": "Alice Doe", "confidence": 78, "reason": "Matches skills X,Y and developer_type web."}\n\n' f"Input:\n{json.dumps(payload)}")
            resp = openai.ChatCompletion.create(model=model, messages=[{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}], temperature=0.0, max_tokens=max_tokens)
            raw = resp["choices"][0]["message"]["content"]
            parsed = _extract_json_from_text(raw)
        except Exception:
            logger.exception("OpenAI request/parse failed; falling back deterministically")
            return self._choose_candidate_fallback(task_payload, candidates)

        meta = {"raw": raw, "parsed": parsed}
        obj = None
        if isinstance(parsed, list) and parsed:
            obj = parsed[0]
        elif isinstance(parsed, dict):
            obj = parsed
        else:
            obj = None

        memberId = None
        memberName = None
        confidence = 0
        reason = ""
        if obj and isinstance(obj, dict):
            memberId = obj.get("memberId") or obj.get("member_id") or obj.get("id")
            memberName = obj.get("memberName") or obj.get("member_name") or obj.get("name")
            confidence = obj.get("confidence") or obj.get("score") or 0
            reason = obj.get("reason") or obj.get("explanation") or ""

        # normalize memberId
        if memberId is not None:
            try:
                if isinstance(memberId, str) and memberId.isdigit():
                    memberId = int(memberId)
                elif isinstance(memberId, (int, float)):
                    memberId = int(memberId)
                else:
                    m = re.search(r"(\d+)", str(memberId))
                    if m:
                        memberId = int(m.group(1))
                    else:
                        memberId = None
            except Exception:
                memberId = None

        candidate_ids = {str(c.get("id")) for c in candidates if c.get("id") is not None}
        resolved_candidate = None
        resolution_path = []
        if memberId is None or str(memberId) not in candidate_ids:
            resolution_path.append("memberId_missing_or_invalid")
            if memberName:
                mname = str(memberName).strip().lower()
                for c in candidates:
                    try:
                        cand_names = [str(c.get("name") or "").strip().lower(), str(c.get("username") or "").strip().lower(), str(c.get("email") or "").strip().lower()]
                    except Exception:
                        cand_names = [str(c.get("name") or "").strip().lower()]
                    if any(mname == cn and cn for cn in cand_names):
                        resolved_candidate = c
                        resolution_path.append(f"exact_name_match:{c.get('id')}")
                        break
                if not resolved_candidate:
                    for c in candidates:
                        try:
                            cn = str(c.get("name") or "").strip().lower()
                        except Exception:
                            cn = ""
                        if cn and (mname in cn or cn in mname):
                            resolved_candidate = c
                            resolution_path.append(f"fuzzy_name_match:{c.get('id')}")
                            break
            if not resolved_candidate:
                m = re.search(r"\b(\d{1,6})\b", raw or "")
                if m:
                    cand_id_guess = m.group(1)
                    if cand_id_guess in candidate_ids:
                        for c in candidates:
                            if str(c.get("id")) == cand_id_guess:
                                resolved_candidate = c
                                resolution_path.append(f"raw_text_id_extract:{cand_id_guess}")
                                break
            if not resolved_candidate and memberName:
                parts = [p.strip() for p in re.split(r"[\s,_\-\.\@]+", memberName) if p.strip()]
                for p in parts:
                    for c in candidates:
                        try:
                            if str(c.get("username") or "").lower().find(p.lower()) != -1 or str(c.get("email") or "").lower().find(p.lower()) != -1:
                                resolved_candidate = c
                                resolution_path.append(f"fragment_match:{p}:{c.get('id')}")
                                break
                        except Exception:
                            continue
                    if resolved_candidate:
                        break

        if resolved_candidate:
            chosen = {"memberId": int(resolved_candidate.get("id")) if resolved_candidate.get("id") is not None else None, "memberName": resolved_candidate.get("name") or resolved_candidate.get("username"), "confidence": int(confidence) if confidence is not None else 0, "reason": (reason or "resolved from memberName/raw output") + f" (resolution path: {resolution_path})", "meta": {"parsed": parsed, "raw": raw, "resolution_path": resolution_path, "candidate": resolved_candidate}}
            return chosen

        if memberId is not None and str(memberId) in candidate_ids:
            chosen_candidate = next((c for c in candidates if str(c.get("id")) == str(memberId)), None)
            return {"memberId": int(memberId), "memberName": memberName or (chosen_candidate and chosen_candidate.get("name")), "confidence": int(confidence) if confidence is not None else 0, "reason": reason or "openai selection", "meta": {"parsed": parsed, "raw": raw, "candidate": chosen_candidate}}

        logger.warning("OpenAI returned no valid memberId and resolution failed. Raw model output: %s", raw)
        fallback = self._choose_candidate_fallback(task_payload, candidates)
        fallback["meta"] = fallback.get("meta", {})
        fallback["meta"].update({"raw_openai": raw, "parsed_openai": parsed, "resolution_attempts": resolution_path})
        fallback["reason"] = (fallback.get("reason") or "") + " (fallback after OpenAI no-valid-id)"
        return fallback

    def _resolve_candidate_to_user(self, chosen_member_id, chosen_member_name, candidates):
        diag = {"chosen_member_id": chosen_member_id, "chosen_member_name": chosen_member_name, "steps": []}
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

        try:
            MemberModel = apps.get_model("members", "Member")
        except Exception:
            MemberModel = None
        if MemberModel and chosen_member_id is not None:
            try:
                diag["steps"].append(f"trying Member(pk={chosen_member_id}).user")
                member = MemberModel.objects.filter(pk=chosen_member_id).select_related("user").first()
                if member and getattr(member, "user", None):
                    diag["resolved_by"] = "member.user_by_pk"
                    return member.user, diag
                elif member:
                    diag["steps"].append("Member found but has no user")
            except Exception:
                logger.exception("resolve step Member.pk failed")
                diag["steps"].append("exception in member.pk step")

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
                diag["steps"].append("exception in exact match")

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
                    diag["steps"].append("exception in username icontains")

        diag["steps"].append("no resolution found")
        return None, diag

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny], url_path="stats")
    def stats(self, request):
        total_created = TaskAI.objects.filter(created_by=request.user).count()
        return Response({"total_created": total_created}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny], url_path="created")
    def created(self, request):
        qs = TaskAI.objects.filter(created_by=request.user).order_by("-created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _auto_assign_task_instance(self, task: TaskAI):
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
            "required_developer_type": self.infer_task_dev_type({"developer_type": getattr(task, "project_type", None) or getattr(task, "developer_type", None) or None, "tags": getattr(task, "tags", []) or []}),
            "required_skills": getattr(task, "extra", {}).get("required_skills") if isinstance(getattr(task, "extra", None), dict) else [],
        }

        candidates = _get_candidate_members(limit=getattr(settings, "OPENAI_MAX_CANDIDATES", 200))
        if not candidates:
            logger.info("Auto-assign: no candidates found")
            return None

        logger.debug("Auto-assign: %d candidates available for task %s", len(candidates), task_payload.get("taskId"))

        chosen = None
        raw_openai = None
        parsed_openai = None
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
            try:
                scored_debug = []
                for c in candidates:
                    s, reason, overlap = self._score_candidate(task_payload, c)
                    scored_debug.append((s, overlap, c.get("id"), c.get("name"), c.get("current_load")))
                scored_debug.sort(key=lambda t: (-t[0], -t[1]))
                logger.debug("Auto-assign debug task=%s top_candidates=%s", task_payload.get("taskId"), scored_debug[:6])
            except Exception:
                logger.exception("failed to produce debug scoring for task %s", task_payload.get("taskId"))
            chosen = self._choose_candidate_fallback(task_payload, candidates)

        if not isinstance(chosen, dict):
            chosen = {"memberId": None, "memberName": None, "confidence": 0, "reason": "no candidate", "meta": None}

        user_obj, diag = self._resolve_candidate_to_user(chosen.get("memberId"), chosen.get("memberName"), candidates)

        task.ai_suggested = True
        try:
            task.ai_confidence = int(chosen.get("confidence") or 0)
        except Exception:
            task.ai_confidence = 0
        task.ai_reason = chosen.get("reason") or (diag.get("steps")[0] if diag.get("steps") else "")
        # persist ai meta including raw openai if present
        meta_for_save = {"chosen": chosen, "diag": diag}
        if chosen.get("meta") and isinstance(chosen.get("meta"), dict):
            # keep raw_openai if present from earlier fallback decorations
            if chosen["meta"].get("raw_openai"):
                meta_for_save["raw_openai"] = chosen["meta"].get("raw_openai")
            if chosen["meta"].get("parsed_openai"):
                meta_for_save["parsed_openai"] = chosen["meta"].get("parsed_openai")
        task.ai_meta = meta_for_save

        if hasattr(task, "assignment_locked"):
            try:
                task.assignment_locked = True
            except Exception:
                logger.exception("failed to set assignment_locked flag")

        if user_obj:
            task.assignee = user_obj
            task.assigned_by = getattr(task, "created_by", None) or None
            task.assigned_at = timezone.now()
            try:
                task.save()
                logger.info("Auto-assigned Task %s -> User %s (conf=%s)", task.pk, user_obj.pk, task.ai_confidence)
            except Exception:
                logger.exception("Failed to save TaskAI after auto-assign")
                try:
                    TaskAI.objects.filter(pk=task.pk).update(assignee_id=user_obj.pk, assigned_by_id=(getattr(task, "created_by_id", None) or None), assigned_at=timezone.now(), ai_suggested=True, ai_confidence=task.ai_confidence, ai_reason=task.ai_reason, ai_meta=task.ai_meta, **({"assignment_locked": True} if hasattr(task, "assignment_locked") else {}))
                except Exception:
                    logger.exception("Fallback update also failed for auto-assign")
            try:
                Notification = apps.get_model("timesheet", "Notification")
                Notification.objects.create(recipient_id=user_obj.pk, verb=f"You have been assigned to task: {task.title or task.pk}", task_id=task.pk)
            except Exception:
                logger.exception("Failed to create Notification for auto-assigned task %s", task.pk)
            return user_obj

        try:
            task.save()
        except Exception:
            logger.exception("Failed to save TaskAI with ai_meta when no user resolved")
        logger.info("Auto-assign did not resolve a User for Task %s; diag=%s", task.pk, diag)
        return None

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny], url_path="reviews")
    def reviews(self, request, pk=None):
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

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny], url_path="reviews")
    def create_review(self, request, pk=None):
        try:
            task = TaskAI.objects.get(pk=pk)
        except TaskAI.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskReviewSerializer(data=request.data, context={"request": request, "task": task})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        reviewed_member = None
        try:
            MemberModel = apps.get_model("projects", "Member")
        except Exception:
            try:
                MemberModel = apps.get_model("members", "Member")
            except Exception:
                MemberModel = None

        if getattr(task, "assignee", None) and MemberModel:
            try:
                reviewed_member = MemberModel.objects.get(user=task.assignee)
            except Exception:
                reviewed_member = None

        if reviewed_member:
            from django.db.models import Avg, Count
            agg = TaskReview.objects.filter(task__assignee=reviewed_member.user, rating__isnull=False).aggregate(avg=Avg("rating"), cnt=Count("id"))
            avg_rating = agg["avg"] or 0.0
            cnt = agg["cnt"] or 0
            fields_to_update = []
            if hasattr(reviewed_member, "avg_rating"):
                reviewed_member.avg_rating = float(avg_rating)
                fields_to_update.append("avg_rating")
            if hasattr(reviewed_member, "review_count"):
                reviewed_member.review_count = int(cnt)
                fields_to_update.append("review_count")
            if hasattr(reviewed_member, "last_reviewed_at"):
                reviewed_member.last_reviewed_at = review.created_at
                fields_to_update.append("last_reviewed_at")
            if fields_to_update:
                try:
                    reviewed_member.save(update_fields=fields_to_update)
                except Exception:
                    logger.exception("Failed updating review aggregates on Member %s", getattr(reviewed_member, "pk", None))

        out_ser = TaskReviewSerializer(review, context={"request": request, "task": task})
        return Response(out_ser.data, status=status.HTTP_201_CREATED)
