// TasksPreviewPage.updated.persist.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Spinner, Alert } from "react-bootstrap";

/**
 * TasksPreviewPage — updated to persist AI suggestions
 *
 * - Use "Get AI suggestions" to get suggestions (unchanged).
 * - New: "Persist suggestions" button will call the backend assign endpoint
 *   for each suggested task to actually save the assignee on the server.
 *
 * Requirements:
 * - Serializer must expose `assignment_locked` (read-only) for server-side locks.
 * - The authenticated user (token) must be the task creator or staff to assign,
 *   or backend Option B allows assign if created_by is null and user is authenticated.
 *
 * Configure NEXT_PUBLIC_API_BASE to change base URL (defaults to http://127.0.0.1:8000/api).
 */

const PREVIEW_STORAGE_KEY = "task_preview_items";
const PREVIEW_PROJECTS_KEY = "task_preview_projects";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/api";

export default function TasksPreviewPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [projectLabels, setProjectLabels] = useState<Record<string, string> | null>(null);

  // AI / Auto-assign state
  const [useBackend, setUseBackend] = useState(true);
  const [aiAssigning, setAiAssigning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<any[] | null>(null);

  // Persist state
  const [persisting, setPersisting] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistSuccessCount, setPersistSuccessCount] = useState<number | null>(null);

  // local user context (best-effort; optionally provided via localStorage)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserIsStaff, setCurrentUserIsStaff] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
      const rawProj = localStorage.getItem(PREVIEW_PROJECTS_KEY);

      if (rawProj) {
        try {
          const parsedProj = JSON.parse(rawProj);
          setProjectLabels(parsedProj && typeof parsedProj === "object" ? parsedProj : {});
        } catch (e) {
          setProjectLabels({});
        }
      } else {
        setProjectLabels({});
      }

      if (!raw) {
        setTasks([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setTasks(parsed);
      else setTasks([]);
    } catch (e) {
      console.warn("Failed to read tasks preview from localStorage", e);
      setTasks([]);
      setProjectLabels({});
    }

    // best-effort read user metadata from localStorage (depends on your frontend auth)
    try {
      const uid = localStorage.getItem("user_id") || localStorage.getItem("userId") || localStorage.getItem("me_id");
      if (uid) setCurrentUserId(String(uid));
      const staffFlag = localStorage.getItem("is_staff") || localStorage.getItem("isStaff");
      if (staffFlag) setCurrentUserIsStaff(String(staffFlag) === "true");
    } catch (e) {
      // ignore
    }
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleClear = () => {
    localStorage.removeItem(PREVIEW_STORAGE_KEY);
    localStorage.removeItem(PREVIEW_PROJECTS_KEY);
    setTasks([]);
    setProjectLabels({});
    setAiResults(null);
    setAiError(null);
    setPersistError(null);
    setPersistSuccessCount(null);
  };

  const resolveProjectLabel = (t: any) => {
    if (t.projectLabel) return t.projectLabel;
    if (t.project && (t.project.name || t.project.title || t.project.project_name)) {
      return t.project.name ?? t.project.title ?? t.project.project_name;
    }
    const id = t.selectedProjectId ?? t.project ?? t.project_id ?? null;
    if (id == null) return "";
    if (projectLabels && projectLabels[String(id)]) return projectLabels[String(id)];
    return String(id);
  };

  // ---------- Helpers for client-side matching ----------
  const toks = (x: any) => {
    if (!x) return [];
    if (Array.isArray(x)) return x.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
    return String(x).split(",").map((s) => s.toLowerCase().trim()).filter(Boolean);
  };

  const scoreCandidate = (task: any, cand: any) => {
    const taskSkills = toks(task.required_skills || task.skills || task.tags || []);
    const candSkills = toks(cand.skills || cand.skill || cand.skills_list || "");
    const needed = Math.max(1, taskSkills.length);
    let overlap = 0;
    if (taskSkills.length) {
      overlap = taskSkills.reduce((acc: number, s: string) => acc + (candSkills.includes(s) ? 1 : 0), 0);
    }
    const skillScore = taskSkills.length ? (overlap / needed) * 50 : 0;

    const memberExp = parseFloat(cand.experience || cand.years || 0) || 0;
    const capped = Math.max(0, Math.min(20, memberExp));
    let experienceScore = (capped / 20) * 30;

    const reqDev =
      (task.required_developer_type || task.developer_type || task.project_type || "") || "";
    const candDev = (cand.developer_type || cand.dev_type || "") || "";
    const devScore =
      reqDev &&
      candDev &&
      String(reqDev).toLowerCase() === String(candDev).toLowerCase()
        ? 20
        : 0;

    const expBonus = memberExp >= 8 ? 5 : memberExp >= 5 ? 3 : 0;

    if (!taskSkills.length) {
      experienceScore = Math.min(30, experienceScore + 10);
    }

    if (taskSkills.length && overlap === 0 && devScore > 0 && memberExp >= 5) {
      experienceScore = Math.max(experienceScore, 25);
    }

    const total = Math.round(Math.max(0, Math.min(100, skillScore + experienceScore + devScore + expBonus)));
    const reason = `skills ${overlap}/${needed}; exp ${memberExp}yr; devMatch ${devScore > 0 ? "yes" : "no"}`;
    return { score: total, reason };
  };

  async function fetchMembers(): Promise<any[] | null> {
    const token = localStorage.getItem("token");
    const endpoints = [
      `${API_BASE}/members/`,
      `${API_BASE}/users/members/`,
      `${API_BASE}/api/members/`,
      `${API_BASE}/members`,
      `${API_BASE}/users/`,
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: token ? { Authorization: `Token ${token}` } : undefined });
        if (res.status === 404) continue;
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.results)) return json.results;
        if (json && typeof json === "object") {
          const arr = Object.values(json).filter((v) => v && typeof v === "object");
          if (arr.length > 0) return arr;
        }
      } catch (err) {
        console.warn("fetchMembers error for", url, err);
      }
    }
    return null;
  }

  const chooseBestLocal = (task: any, members: any[]) => {
    let best: any = null;
    for (const m of members) {
      const { score, reason } = scoreCandidate(task, m);
      if (!best || score > best.score) {
        best = {
          memberId: m.id ?? m.user_id ?? m.pk ?? null,
          memberName: m.name ?? m.username ?? m.email ?? null,
          confidence: score,
          reason,
          raw: m,
        };
      }
    }
    return best || { memberId: null, memberName: null, confidence: 0, reason: "no candidates" };
  };

  const buildPayloadTasks = () => {
    if (!tasks) return [];
    return tasks.map((t) => ({
      id: t.id ?? t.pk ?? null,
      title: t.title ?? "",
      web_desc: t.web_desc ?? t.description ?? "",
      mobile_desc: t.mobile_desc ?? "",
      figma_desc: t.figma_desc ?? "",
      tags: t.tags ?? [],
      priority: t.priority ?? "",
      deadline: t.deadline ?? "",
      hours: t.hours ?? 0,
      required_developer_type: t.project_type ?? t.developer_type ?? null,
      required_skills: (t.extra && t.extra.required_skills) ?? t.required_skills ?? t.skills ?? t.tags ?? [],
    }));
  };

  // ---------- Helpers for lock & acceptance ----------
  const isTaskLocked = (t: any) => {
    if (!t) return false;
    if (t.assignment_locked) return true;
    if (t.ai_chosen_member && (t.ai_chosen_member.assignment_locked || t.ai_chosen_member.locked)) return true;
    if (t.ai_chosen_member && t.ai_chosen_member.assignedUserId) return true;
    return false;
  };

  const isCurrentUserAssignee = (t: any) => {
    if (!currentUserId) return false;
    const picked = t.ai_chosen_member;
    if (!picked) return false;
    return String(picked.memberId) === String(currentUserId) || String(picked.assignedUserId) === String(currentUserId);
  };

  // ---------- Persist assignments (NEW) ----------
  const handlePersistAssignments = async () => {
    setPersistError(null);
    setPersistSuccessCount(null);

    // Collect suggestions (server-returned aiResults preferred)
    const suggestions = aiResults && aiResults.length > 0
      ? aiResults
      : (tasks || []).map((t) => {
          const c = t.ai_chosen_member;
          return c ? { taskId: t.id ?? t.pk, memberId: c.memberId, memberName: c.memberName, assignment_locked: !!c.assignment_locked } : null;
        }).filter(Boolean);

    if (!suggestions || suggestions.length === 0) {
      setPersistError("No suggestions available to persist.");
      return;
    }

    setPersisting(true);
    let successCount = 0;
    const token = localStorage.getItem("token");

    for (const s of suggestions) {
      const taskId = s.taskId;
      const memberId = s.memberId;

      if (!taskId || !memberId) continue;

      // Skip if already persisted locally
      const localTask = (tasks || []).find((t) => String(t.id ?? t.pk) === String(taskId));
      if (localTask && localTask.ai_chosen_member && localTask.ai_chosen_member.assignedUserId) continue;

      try {
        const url = `${API_BASE}/tasksai/${taskId}/assign/`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
          body: JSON.stringify({ assignee_id: memberId, ai_suggested: true }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          if (res.status === 403) {
            setPersistError("Permission denied while persisting assignments. You must be the task creator or staff. Server said: " + (txt || res.statusText));
            break;
          } else if (res.status === 401) {
            setPersistError("Authentication required to persist suggestions. Please sign in. Server said: " + (txt || res.statusText));
            break;
          } else {
            console.warn("Persist failed for task", taskId, res.status, txt);
            continue;
          }
        }

        // success — re-fetch the task detail
                const respJson = await res.json().catch(() => null);
                try {
                  const detailUrl = `${API_BASE}/tasksai/${taskId}/`;
                  const detailRes = await fetch(detailUrl, { headers: token ? { Authorization: `Token ${token}` } : {} });
                  if (detailRes.ok) {
                    const detail = await detailRes.json();
                    successCount += 1;
                    setTasks((prev) => {
                      if (!prev) return prev;
                      return prev.map((t) => {
                        if (String(t.id ?? t.pk) !== String(taskId)) return t;
                        return { ...t, ...detail, ai_chosen_member: { ...(t.ai_chosen_member || {}), assignedUserId: detail.assignee ?? memberId, assignment_locked: detail.assignment_locked ?? true } };
                      });
                    });
                  } else {
                    // optimistic update fallback
                    successCount += 1;
                    setTasks((prev) => {
                      if (!prev) return prev;
                      return prev.map((t) => {
                        if (String(t.id ?? t.pk) !== String(taskId)) return t;
                        const cloned = { ...t };
                        const ai = cloned.ai_chosen_member ? { ...cloned.ai_chosen_member } : {};
                        ai.assignedUserId = ai.assignedUserId || memberId;
                        ai.assignment_locked = true;
                        cloned.ai_chosen_member = ai;
                        cloned.assignment_locked = true;
                        return cloned;
                      });
                    });
                  }
                } catch (detailErr) {
                  console.warn("Failed to fetch updated task detail for", taskId, detailErr);
                  successCount += 1;
                  setTasks((prev) => {
                    if (!prev) return prev;
                    return prev.map((t) => {
                      if (String(t.id ?? t.pk) !== String(taskId)) return t;
                      const cloned = { ...t };
                      const ai = cloned.ai_chosen_member ? { ...cloned.ai_chosen_member } : {};
                      ai.assignedUserId = ai.assignedUserId || memberId;
                      ai.assignment_locked = true;
                      cloned.ai_chosen_member = ai;
                      cloned.assignment_locked = true;
                      return cloned;
                    });
                  });
                }
      } catch (err) {
        console.error("Persist error for task", taskId, err);
        continue;
      }
    }

    setPersisting(false);
    setPersistSuccessCount(successCount);
  };

  // ---------- Action: get AI suggestions ----------
  const handleGetAISuggestions = async () => {
    setAiError(null);
    setAiResults(null);
    setAiAssigning(true);

    const payloadTasks = buildPayloadTasks();
    if (payloadTasks.length === 0) {
      setAiError("No tasks to evaluate.");
      setAiAssigning(false);
      return;
    }

    const token = localStorage.getItem("token");

    if (useBackend) {
      try {
        const res = await fetch(`${API_BASE}/tasksai/auto-assign/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
          body: JSON.stringify({ tasks: payloadTasks }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || res.statusText || `status ${res.status}`);
        }

        const json = await res.json();
        if (!Array.isArray(json)) {
          throw new Error("Backend returned malformed response (expected array).");
        }

        const candidateMembers = await fetchMembers();
        const validatedResults: any[] = [];
        for (const item of json) {
          const taskId = item?.taskId ?? null;
          const memberId = item?.memberId ?? null;

          const itemLocked =
            item?.assignment_locked ?? item?.assignmentLock ?? item?.locked ?? item?.is_locked ?? false;

          if (memberId == null && candidateMembers && candidateMembers.length > 0) {
            const origTask = payloadTasks.find((t) => String(t.id) === String(taskId));
            if (origTask) {
              const fallback = chooseBestLocal(origTask, candidateMembers);
              validatedResults.push({
                taskId,
                memberId: fallback.memberId,
                memberName: fallback.memberName,
                confidence: fallback.confidence,
                reason: `fallback client pick: ${fallback.reason}`,
                raw: fallback.raw,
                assignedUserId: item?.assignedUserId ?? null,
                assignment_locked: itemLocked,
              });
              continue;
            }
          }

          validatedResults.push({
            taskId,
            memberId,
            memberName: item?.memberName ?? null,
            confidence: item?.confidence ?? null,
            reason: item?.reason ?? null,
            assignedUserId: item?.assignedUserId ?? null,
            assignment_locked: itemLocked,
            raw: item?.raw ?? null,
          });
        }

        setAiResults(validatedResults);

        if (Array.isArray(validatedResults)) {
          const updated = (tasks || []).map((t) => {
            const r = (validatedResults || []).find((x: any) => String(x.taskId) === String(t.id ?? t.pk));
            if (r) {
              return {
                ...t,
                ai_chosen_member: {
                  memberId: r.memberId,
                  memberName: r.memberName,
                  confidence: r.confidence,
                  reason: r.reason,
                  assignedUserId: r.assignedUserId,
                  raw: r.raw ?? null,
                  assignment_locked: !!r.assignment_locked,
                },
              };
            }
            return t;
          });
          setTasks(updated);
        }

        setAiAssigning(false);
        return;
      } catch (err: any) {
        console.warn("Backend auto-assign failed:", err);
        setAiError("Backend suggestion failed: " + (err?.message || err));
      }
    }

    // Client-side fallback
    try {
      const members = await fetchMembers();
      if (!members || members.length === 0) {
        setAiError("No members available for client-side matching.");
        setAiAssigning(false);
        return;
      }

      const results: any[] = [];
      const updated = (tasks || []).map((t) => ({ ...t }));

      for (const t of payloadTasks) {
        const best = chooseBestLocal(t, members);
        results.push({ taskId: t.id, memberId: best.memberId, memberName: best.memberName, confidence: best.confidence, reason: best.reason, raw: best.raw });
        const idx = (updated || []).findIndex((x: any) => String(x.id ?? x.pk) === String(t.id));
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ai_chosen_member: { memberId: best.memberId, memberName: best.memberName, confidence: best.confidence, reason: best.reason, raw: best.raw, assignment_locked: false } };
        }
      }

      setTasks(updated);
      setAiResults(results);
    } catch (err: any) {
      console.error("Client-side matching failed", err);
      setAiError("Client matching failed: " + (err?.message || err));
    } finally {
      setAiAssigning(false);
    }
  };

  const handleClearAISuggestions = () => {
    setAiResults(null);
    setAiError(null);
    if (tasks) {
      setTasks(tasks.map((t) => {
        const copy = { ...t };
        delete copy.ai_chosen_member;
        return copy;
      }));
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Created Tasks — Preview</h3>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
          <Button variant="danger" onClick={handleClear}>
            Clear Preview
          </Button>
        </div>
      </div>

      <div className="mb-3 d-flex align-items-center gap-3">
        <Form.Check
          type="checkbox"
          id="use-backend"
          label="Use backend suggestions (preferred)"
          checked={useBackend}
          onChange={(e) => setUseBackend(e.target.checked)}
        />
        <Button variant="primary" onClick={handleGetAISuggestions} disabled={aiAssigning || !tasks || tasks.length === 0}>
          {aiAssigning ? (
            <>
              <Spinner animation="border" size="sm" /> Getting suggestions...
            </>
          ) : (
            "Get AI suggestions"
          )}
        </Button>

        <Button variant="success" onClick={handlePersistAssignments} disabled={persisting || (!aiResults && !(tasks || []).some(t => t.ai_chosen_member))}>
          {persisting ? <><Spinner animation="border" size="sm" /> Persisting...</> : "Persist suggestions"}
        </Button>

        <Button variant="outline-secondary" onClick={handleClearAISuggestions} disabled={!aiResults && !tasks?.some(t => t.ai_chosen_member)}>
          Clear suggestions
        </Button>
      </div>

      {aiError && <Alert variant="warning" className="mb-3">{aiError}</Alert>}
      {persistError && <Alert variant="danger" className="mb-3">{persistError}</Alert>}
      {persistSuccessCount !== null && <Alert variant="success" className="mb-3">Persisted {persistSuccessCount} suggestion(s).</Alert>}

      {tasks === null ? (
        <div>Loading preview…</div>
      ) : tasks.length === 0 ? (
        <div className="alert alert-info">No tasks found for preview.</div>
      ) : (
        <>
          <div className="table-responsive g-table-wrap g-t-scroll mb-4">
            <table className="table g-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Title</th>
                  <th>Project Type</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Hours</th>
                  <th>Tags</th>
                  <th>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t: any, idx: number) => (
                  <tr key={t.id ?? idx}>
                    <td>{resolveProjectLabel(t)}</td>
                    <td>{t.title}</td>
                    <td>{t.project_type ?? t.projectType}</td>
                    <td>{t.priority}</td>
                    <td>{t.deadline}</td>
                    <td>{t.hours}</td>
                    <td>{(t.tags ?? []).join?.(", ")}</td>
                    <td>
                      {t.ai_chosen_member ? (
                        <>
                          <span>
                            {t.ai_chosen_member.memberName ?? "Member"} (AI — {t.ai_chosen_member.confidence ?? "—"}%)
                          </span>
                          {" "}
                          {isTaskLocked(t) ? (
                            <span className="badge bg-warning text-dark ms-2">AI & Locked</span>
                          ) : (
                            <span className="badge bg-info ms-2">AI suggestion</span>
                          )}
                          {t.ai_chosen_member.assignedUserId ? (
                            <span className="badge bg-success ms-2">Persisted (User #{t.ai_chosen_member.assignedUserId})</span>
                          ) : null}
                        </>
                      ) : t.assignee_name ? (
                        <>
                          {t.assignee_name}{t.assignment_locked ? <span className="badge bg-warning text-dark ms-2">Locked</span> : null}
                        </>
                      ) : t.assignee ? (
                        <>
                          {`User #${t.assignee}`}
                          {t.assignment_locked ? <span className="badge bg-warning text-dark ms-2">Locked</span> : null}
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <h5>AI Suggestions</h5>
            {(!aiResults || aiResults.length === 0) && !tasks.some((t: any) => t.ai_chosen_member) ? (
              <div className="text-muted">No AI suggestions yet. Click "Get AI suggestions" to run.</div>
            ) : (
              <div>
                <ul className="list-group">
                  {(aiResults && aiResults.length > 0
                    ? aiResults
                    : tasks.map((t: any) => {
                        const c = t.ai_chosen_member;
                        return c ? { taskId: t.id ?? t.pk, memberId: c.memberId, memberName: c.memberName, confidence: c.confidence, reason: c.reason, assignedUserId: c.assignedUserId, assignment_locked: c.assignment_locked } : null;
                      }).filter(Boolean)
                  ).map((r: any, i: number) => (
                    <li key={i} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <strong>Task {r.taskId}</strong>
                        <div className="small text-muted">{r.memberName ? `${r.memberName}` : "No member chosen"}</div>
                        <div className="small text-muted">ID: {r.memberId ?? "—"} • Confidence: {r.confidence ?? "—"}</div>
                        <div className="small">{r.reason ?? ""}</div>
                      </div>
                      <div className="text-end">
                        {r.assignment_locked ? <span className="badge bg-warning text-dark me-2">Locked</span> : null}
                        {r.assignedUserId ? <span className="badge bg-success">Persisted (User #{r.assignedUserId})</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
