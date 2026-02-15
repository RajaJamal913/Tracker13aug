"use client";

import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  Table,
  Spinner,
  Button,
  Badge,
  Row,
  Col,
  Alert,
  Form,
  InputGroup,
} from "react-bootstrap";

/**
 * ReviewTasksPage — supports:
 *  - ?task=<id>
 *  - Next.js useParams() (if you move this page to a dynamic route)
 *  - /dashboard/task-review/<id> (parses last path segment)
 *
 * API expectations:
 *  GET  /api/tasksai/         -> list
 *  GET  /api/tasksai/:id/     -> single task
 *  POST /api/tasksai/:id/reviews/ -> { action, comment }
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const TASK_LIST_PATH = "/api/tasksai/";

type TaskShape = Record<string, any>;

export default function ReviewTasksPage(): JSX.Element {
  const router = useRouter();
  const searchParams = (() => {
    try { return useSearchParams(); } catch { return null as any; }
  })();
  const routeParams = (() => {
    try { return useParams(); } catch { return null as any; }
  })();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskShape[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");

  // fetch helper (tries Token then Bearer if token exists; falls back to cookie fetch)
  const fetchWithAuth = useCallback(async (path: string, opts: RequestInit = {}) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = path.startsWith("http") ? path : API_BASE_URL + path;

    if (token) {
      let lastRes: Response | null = null;
      for (const scheme of ["Token", "Bearer"]) {
        const headers = new Headers(opts.headers ?? {});
        if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
        headers.set("Authorization", `${scheme} ${token}`);
        const res = await fetch(url, { ...opts, headers, credentials: "include" });
        lastRes = res;
        if (res.status !== 401) return res;
      }
      return lastRes!;
    }

    const headers = new Headers(opts.headers ?? {});
    if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) headers.set("Content-Type", "application/json");
    return fetch(url, { ...opts, headers, credentials: "include" });
  }, []);

  const normalizeTasks = useCallback((data: any): TaskShape[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).results)) return (data as any).results;
    if (data && typeof data === "object") return [data];
    return [];
  }, []);

  // Extract a task id from multiple possible locations:
  // 1) ?task= via useSearchParams, 2) useParams() (if dynamic route), 3) last pathname segment
  const extractTaskIdFromUrl = () => {
    try {
      // 1) search param
      if (searchParams && typeof searchParams.get === "function") {
        const s = searchParams.get("task");
        if (s) return s;
      }
    } catch { /* ignore */ }

    try {
      // 2) Next.js route params (if you later move to /dashboard/task-review/[id])
      if (routeParams) {
        // use common param names 'id' or 'taskId' or 'task'
        if (typeof routeParams.id === "string" && routeParams.id) return routeParams.id;
        if (typeof routeParams.task === "string" && routeParams.task) return routeParams.task;
        if (typeof routeParams.taskId === "string" && routeParams.taskId) return routeParams.taskId;
      }
    } catch { /* ignore */ }

    try {
      // 3) fallback: parse last segment from window.location.pathname
      if (typeof window !== "undefined") {
        const p = window.location.pathname.replace(/\/+$/, ""); // trim trailing slash
        const seg = p.split("/").pop();
        if (seg && /^\d+$/.test(seg)) return seg; // numeric id only
        // allow non-numeric ids too (if your ids are UUIDs or slugs)
        if (seg && /^[A-Za-z0-9_-]+$/.test(seg)) {
          // but avoid returning 'task-review' itself
          if (!["task-review", "task_review", "taskreview"].includes(seg)) return seg;
        }
      }
    } catch { /* ignore */ }

    return null;
  };

  // Load tasks (single if id found else list). Uses AbortController if provided by caller.
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const taskId = extractTaskIdFromUrl();

    try {
      let res: Response;
      if (taskId) {
        // fetch single task
        // console.log("[ReviewTasksPage] fetch single task:", taskId);
        res = await fetchWithAuth(`${API_BASE_URL}/api/tasksai/${taskId}/`, { method: "GET", signal });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Load failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
        }
        const data = await res.json().catch(() => null);
        setTasks(normalizeTasks(data));
      } else {
        // fetch list
        // console.log("[ReviewTasksPage] fetch list");
        res = await fetchWithAuth(TASK_LIST_PATH, { method: "GET", signal });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Load failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
        }
        const data = await res.json().catch(() => null);
        setTasks(normalizeTasks(data));
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(String(err?.message ?? err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, normalizeTasks, searchParams, routeParams]);

  // reload on mount and when search params / route params change
  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    // key for dependency: search params string & route params stringify
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(searchParams && typeof searchParams.toString === "function") ? searchParams.toString() : null, JSON.stringify(routeParams || {})]);

  const toggleExpand = (t: TaskShape) => {
    const key = String(t.id ?? t.pk ?? "");
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const prettyJSON = (obj: any) => {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  };

  const performAction = useCallback(async (taskId: string | number, action: "approve" | "reject") => {
    const key = String(taskId);
    setActionError(prev => ({ ...prev, [key]: "" }));
    setActionSuccess(prev => ({ ...prev, [key]: "" }));
    setActionLoading(prev => ({ ...prev, [key]: true }));

    const comment = (commentDrafts[key] ?? "").trim();

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/tasksai/${taskId}/reviews/`, {
        method: "POST",
        body: JSON.stringify({ action, comment }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status}${txt ? ` — ${txt}` : ""}`);
      }

      const json = await res.json().catch(() => null);

      setTasks(prev =>
        prev.map(t => {
          if (String(t.id ?? t.pk) !== key) return t;
          return {
            ...t,
            review_status: action === "approve" ? "approved" : "rejected",
            review_comment: comment || (json?.text ?? t.review_comment),
            _reviewResponse: json,
          };
        })
      );

      setActionSuccess(prev => ({ ...prev, [key]: `Marked ${action === "approve" ? "approved" : "rejected"}` }));
      setExpanded(prev => ({ ...prev, [key]: false }));
    } catch (err: any) {
      setActionError(prev => ({ ...prev, [key]: String(err?.message ?? err) }));
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
      setTimeout(() => setActionSuccess(prev => ({ ...prev, [key]: "" })), 3000);
    }
  }, [commentDrafts, fetchWithAuth]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "pending") return !(t.review_status === "approved" || t.review_status === "rejected");
    return t.review_status === "approved" || t.review_status === "rejected";
  }), [tasks, filter]);

  return (
    <div className="container py-4">
      <div className="header-card p-3 mb-4 d-flex justify-content-between align-items-start">
        <div>
          <h3 className="mb-1">Review Tasks — Pending Review</h3>
          <p className="text-muted mb-0">Approve or reject AI suggestions and add reviewer comments.</p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <Button className="g-btn" onClick={() => router.push("/dashboard/task-new")}>+ Create Task</Button>
          <Button className="g-btn-secondary" onClick={() => load()}>Refresh</Button>
        </div>
      </div>

      <div className="mb-3 d-flex gap-2 align-items-center">
        <Form.Check type="radio" inline label="All" name="filter" id="f-all" checked={filter === "all"} onChange={() => setFilter("all")} />
        <Form.Check type="radio" inline label="Pending" name="filter" id="f-pending" checked={filter === "pending"} onChange={() => setFilter("pending")} />
        <Form.Check type="radio" inline label="Reviewed" name="filter" id="f-reviewed" checked={filter === "reviewed"} onChange={() => setFilter("reviewed")} />
      </div>

      {loading && <div className="text-center py-5"><Spinner animation="border" /> Loading tasks...</div>}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && filtered.length === 0 && <Alert variant="info">No tasks to review.</Alert>}

      {!loading && !error && filtered.length > 0 && (
        <div className="card list-card p-3">
          <div className="table-responsive custom-table-wrap">
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: "18%" }}>Project</th>
                  <th style={{ width: "26%" }}>Title</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Assignee</th>
                  <th style={{ width: "10%" }}>AI</th>
                  <th style={{ width: "18%" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((t, i) => {
                  const key = String(t.id ?? t.pk ?? i);
                  const isExpanded = !!expanded[key];
                  const reviewState = t.review_status ?? (t.assignee && t.assigned_by ? "reviewed" : "pending");

                  return (
                    <React.Fragment key={key}>
                      <tr className="row-main" onClick={() => toggleExpand(t)} style={{ cursor: "pointer" }}>
                        <td>{t.project_name ?? (t.project && (t.project.name || t.project.title)) ?? "-"}</td>
                        <td>
                          <div><strong className="task-title">{t.title ?? `Task #${key}`}</strong></div>
                          {t.web_desc ? <small className="text-muted">{String(t.web_desc).slice(0, 120)}{String(t.web_desc).length > 120 ? "…" : ""}</small> : null}
                        </td>
                        <td>{t.priority ?? "-"}</td>
                        <td className="text-nowrap">{t.deadline ?? "-"}</td>
                        <td>{t.assignee_name ?? (t.assignee && (t.assignee.username || t.assignee.email)) ?? "-"}</td>
                        <td>
                          {t.ai_suggested ? <Badge bg="info" className="ai-badge">AI {t.ai_confidence ? `(${t.ai_confidence}%)` : ""}</Badge> : <Badge bg="secondary">Manual</Badge>}
                          {t.assignment_locked ? <span className="ms-2 badge locked">Locked</span> : null}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); performAction(t.id ?? t.pk, "approve"); }} disabled={!!actionLoading[key] || reviewState === "approved"}>
                              {actionLoading[key] ? <Spinner animation="border" size="sm" /> : "Approve"}
                            </Button>

                            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); performAction(t.id ?? t.pk, "reject"); }} disabled={!!actionLoading[key] || reviewState === "rejected"}>
                              {actionLoading[key] ? <Spinner animation="border" size="sm" /> : "Reject"}
                            </Button>

                            <Button size="sm" variant="outline-primary" onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [key]: true })); }}>
                              Comment
                            </Button>
                          </div>

                          {actionSuccess[key] ? <div className="small text-success mt-1">{actionSuccess[key]}</div> : null}
                          {actionError[key] ? <div className="small text-danger mt-1">{actionError[key]}</div> : null}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="row-detail">
                          <td colSpan={7} className="detail-cell">
                            <Row>
                              <Col md={8}>
                                <h5 className="mb-1">{t.title}</h5>
                                <p className="text-muted">{t.web_desc ?? t.mobile_desc ?? t.figma_desc ?? "-"}</p>

                                <Table size="sm" bordered className="mb-0 detail-table">
                                  <tbody>
                                    <tr><th style={{ width: 180 }}>Project</th><td>{t.project_name ?? (t.project && (t.project.name || t.project.title)) ?? "-"}</td></tr>
                                    <tr><th>Priority</th><td>{t.priority ?? "-"}</td></tr>
                                    <tr><th>Deadline</th><td>{t.deadline ?? "-"}</td></tr>
                                    <tr><th>Estimated Hours</th><td>{t.hours ?? "-"}</td></tr>
                                    <tr><th>Tags</th><td>{Array.isArray(t.tags) ? t.tags.join(", ") : t.tags ?? "-"}</td></tr>
                                    <tr><th>AI Reason</th><td>{t.ai_reason ?? "-"}</td></tr>
                                    <tr><th>Review Status</th><td>{t.review_status ?? "pending"}</td></tr>
                                    <tr><th>Reviewer Comment</th><td>{t.review_comment ?? "-"}</td></tr>
                                  </tbody>
                                </Table>
                              </Col>

                              <Col md={4}>
                                <div className="meta-box mb-3">
                                  <div className="meta-header">AI Meta</div>
                                  <pre className="meta-pre">{prettyJSON(t.ai_meta ?? {})}</pre>
                                </div>

                                <div className="mb-2">
                                  <InputGroup>
                                    <Form.Control as="textarea" rows={3} placeholder="Leave a reviewer comment (optional)"
                                      value={commentDrafts[key] ?? ""} onChange={(e) => setCommentDrafts(prev => ({ ...prev, [key]: e.target.value }))} />
                                  </InputGroup>
                                </div>

                                <div className="d-grid gap-2">
                                  <Button variant="success" onClick={(e) => { e.stopPropagation(); performAction(t.id ?? t.pk, "approve"); }} disabled={!!actionLoading[key]}>Approve</Button>
                                  <Button variant="danger" onClick={(e) => { e.stopPropagation(); performAction(t.id ?? t.pk, "reject"); }} disabled={!!actionLoading[key]}>Reject</Button>
                                  <Button variant="light" onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [key]: false })); }}>Close</Button>
                                </div>

                                {actionError[key] ? <Alert variant="danger" className="mt-2">{actionError[key]}</Alert> : null}
                                {actionSuccess[key] ? <Alert variant="success" className="mt-2">{actionSuccess[key]}</Alert> : null}
                              </Col>
                            </Row>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      <style jsx>{/* same styles as before — omitted for brevity in this message */``}</style>
    </div>
  );
}
