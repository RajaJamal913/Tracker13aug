"use client";

import React, { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Spinner, Button, Badge, Row, Col, Alert } from "react-bootstrap";

type TaskItem = {
  id?: number | string;
  pk?: number | string;
  title?: string;
  project?: any;
  project_name?: string | null;
  project_type?: string | null;
  web_desc?: string | null;
  mobile_desc?: string | null;
  figma_desc?: string | null;
  priority?: string | null;
  deadline?: string | null;
  hours?: number | null;
  tags?: string[] | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  assignee?: number | null | { id?: number; username?: string; email?: string; first_name?: string; last_name?: string };
  assignee_name?: string | null;
  assignee_full_name?: string | null;
  assigned_by?: number | null;
  assigned_at?: string | null;
  ai_suggested?: boolean;
  ai_confidence?: number | null;
  ai_reason?: string | null;
  ai_meta?: any;
  assignment_locked?: boolean;
  extra?: any;
  [k: string]: any;
};

const API_PATH = "/api/tasksai/created/";

function prettyJSON(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function resolveAssigneeDisplay(t: TaskItem) {
  try {
    if (t.assignee && typeof t.assignee === "object") {
      const a: any = t.assignee;
      const full = (a.first_name || a.last_name) ? `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() : null;
      return a.username ?? full ?? a.email ?? `User#${a.id ?? "?"}`;
    }
    if (t.assignee_full_name) return t.assignee_full_name;
    if (t.assignee_name) return t.assignee_name;

    const meta = t.ai_meta ?? {};
    if (meta) {
      const chosen = meta.chosen ?? meta.selection ?? meta.selection_info ?? null;
      const tryName = (obj: any) => {
        if (!obj) return null;
        return obj.memberName ?? obj.member_name ?? obj.name ?? (obj.candidate && (obj.candidate.name ?? obj.candidate.username)) ?? null;
      };
      const n1 = tryName(chosen);
      if (n1) return n1;
      const topCandidateName = meta.memberName ?? meta.member_name ?? meta.chosen_member_name ?? null;
      if (topCandidateName) return topCandidateName;
    }

    if (t.assignee) return `User#${t.assignee}`;
    return "-";
  } catch (err) {
    return "-";
  }
}

export default function CreatedTasksPage(): JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pageInfo, setPageInfo] = useState<{ next?: string | null; previous?: string | null; count?: number } | null>(null);
  const [fetchUrl, setFetchUrl] = useState<string | null>(API_PATH);
  const [refreshToggle, setRefreshToggle] = useState<number>(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchWithAuth = async (path: string, opts: RequestInit = {}, attemptAuthSchemes: ("Token" | "Bearer")[] = ["Token", "Bearer"]) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const base = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000");
    const url = path.startsWith("http") ? path : base + path;
    if (!token) return fetch(url, { ...opts, credentials: "include" });

    let lastRes: Response | null = null;
    for (const scheme of attemptAuthSchemes) {
      const headers = new Headers(opts.headers ?? {});
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      headers.set("Authorization", `${scheme} ${token}`);
      const res = await fetch(url, { ...opts, headers, credentials: "include" });
      lastRes = res;
      if (res.status !== 401) return res;
    }
    return lastRes!;
  };

  const load = async (url: string | null = API_PATH) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(url ?? API_PATH);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to load: ${res.status} ${txt}`);
      }
      const data = await res.json().catch(() => null);

      if (data && typeof data === "object" && Array.isArray(data.results)) {
        setTasks(data.results as TaskItem[]);
        setPageInfo({ next: data.next ?? null, previous: data.previous ?? null, count: data.count ?? undefined });
        setFetchUrl(null);
      } else if (Array.isArray(data)) {
        setTasks(data as TaskItem[]);
        setPageInfo(null);
        setFetchUrl(null);
      } else if (data && typeof data === "object") {
        const arr = Array.isArray((data as any).data) ? (data as any).data : Array.isArray(Object.values(data).find(v => Array.isArray(v))) ? Object.values(data).find(v => Array.isArray(v)) as any[] : null;
        if (arr) {
          setTasks(arr as TaskItem[]);
          setPageInfo(null);
          setFetchUrl(null);
        } else {
          setTasks([data as TaskItem]);
          setPageInfo(null);
          setFetchUrl(null);
        }
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      console.error("load created tasks error", err);
      setError(String(err?.message ?? err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(fetchUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, refreshToggle]);

  const handleRefresh = () => setRefreshToggle((v) => v + 1);
  const goNext = () => { if (pageInfo?.next) setFetchUrl(pageInfo.next ?? null); };
  const goPrev = () => { if (pageInfo?.previous) setFetchUrl(pageInfo.previous ?? null); };

  const openTaskDetail = (t: TaskItem) => {
    const id = t.id ?? t.pk;
    if (!id) return;
    router.push(`/dashboard/tasks/${id}`);
  };

  const toggleExpand = (t: TaskItem) => {
    const key = String(t.id ?? t.pk ?? "");
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="container py-4">
      <div className="header-card p-3 mb-4 d-flex justify-content-between align-items-start">
        <div>
          <h3 className="mb-1">Tasks — Created by Me</h3>
          <p className="text-muted mb-0">All tasks you created. Click a row to expand details inline.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button className="g-btn" onClick={() => router.push("/dashboard/task-new")}>+ Create Task</Button>
          <Button className="g-btn-secondary" onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5"><Spinner animation="border" /> Loading tasks...</div>
      )}

      {error && <Alert variant="danger"><strong>Error:</strong> {error}</Alert>}

      {!loading && !error && tasks.length === 0 && <Alert variant="info">You haven't created any tasks yet.</Alert>}

      {!loading && !error && tasks.length > 0 && (
        <div className="card list-card p-3">
          <div className="table-responsive custom-table-wrap">
            <Table hover bordered responsive className="mb-0 align-middle">
              <thead className="table-head">
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Hours</th>
                  <th>Assignee</th>
                  <th>AI</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, idx) => {
                  const id = t.id ?? t.pk ?? idx;
                  const key = String(id);
                  const assigneeDisplay = resolveAssigneeDisplay(t);

                  return (
                    <React.Fragment key={key}>
                      <tr className="row-main" onClick={() => toggleExpand(t)} style={{ cursor: "pointer" }}>
                        <td style={{ maxWidth: 320 }}>
                          <div className="d-flex flex-column">
                            <strong className="task-title">{t.title ?? `Task #${id}`}</strong>
                            {t.web_desc ? <small className="text-muted">{String(t.web_desc).slice(0, 110)}{String(t.web_desc).length > 110 ? "…" : ""}</small> : null}
                          </div>
                        </td>
                        <td className="text-nowrap">{t.project_name ?? (t.project && (t.project.name || t.project.title || t.project.project_name)) ?? (t.project ?? "-")}</td>
                        <td>{t.project_type ?? "-"}</td>
                        <td>{t.priority ?? "-"}</td>
                        <td className="text-nowrap">{t.deadline ? String(t.deadline) : "-"}</td>
                        <td>{t.hours ?? "-"}</td>
                        <td>{assigneeDisplay}</td>
                        <td>
                          {t.ai_suggested ? (
                            <Badge bg="info" className="ai-badge">AI {t.ai_confidence != null ? `(${t.ai_confidence}%)` : ""}</Badge>
                          ) : (
                            <Badge bg="secondary">Manual</Badge>
                          )}
                        </td>
                        <td className="text-nowrap">{t.created_at ? fmtDate(t.created_at) : "-"}</td>
                      </tr>

                      {expanded[key] && (
                        <tr className="row-detail">
                          <td colSpan={9} className="detail-cell">
                            <Row>
                              <Col md={8}>
                                <div className="detail-left">
                                  <h5 className="detail-title">{t.title ?? `Task #${id}`}</h5>
                                  <p className="text-muted mb-2">{t.web_desc ?? t.mobile_desc ?? t.figma_desc ?? "-"}</p>

                                  <Table size="sm" bordered className="mb-0 detail-table">
                                    <tbody>
                                      <tr>
                                        <th style={{ width: 180 }}>Project</th>
                                        <td>{t.project_name ?? (t.project && (t.project.name || t.project.title || t.project.project_name)) ?? (t.project ?? "-")}</td>
                                      </tr>
                                      <tr>
                                        <th>Project Type</th>
                                        <td>{t.project_type ?? "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Priority</th>
                                        <td>{t.priority ?? "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Deadline</th>
                                        <td>{t.deadline ?? "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Estimated Hours</th>
                                        <td>{t.hours ?? "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Tags</th>
                                        <td>{(t.tags && Array.isArray(t.tags) ? t.tags.join(", ") : t.tags) ?? "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Created</th>
                                        <td>{t.created_at ? fmtDate(t.created_at) : "-"} {t.created_by ? <div className="text-muted">by {String(t.created_by)}</div> : null}</td>
                                      </tr>
                                      <tr>
                                        <th>Updated</th>
                                        <td>{t.updated_at ? fmtDate(t.updated_at) : "-"}</td>
                                      </tr>
                                      <tr>
                                        <th>Assignee</th>
                                        <td>
                                          {assigneeDisplay}
                                          {t.assigned_by ? <div className="text-muted">Assigned by {String(t.assigned_by)} at {fmtDate(t.assigned_at)}</div> : null}
                                        </td>
                                      </tr>
                                      <tr>
                                        <th>Assignment Lock</th>
                                        <td>{t.assignment_locked ? "Locked" : "Unlocked"}</td>
                                      </tr>
                                      <tr>
                                        <th>AI Suggested</th>
                                        <td>
                                          {t.ai_suggested ? (
                                            <>
                                              <div>Yes — confidence: {t.ai_confidence ?? 0}%</div>
                                              <div className="text-muted small">Reason: {t.ai_reason ?? "—"}</div>
                                            </>
                                          ) : "No"}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </Table>
                                </div>
                              </Col>

                              <Col md={4}>
                                <div className="detail-right">
                                  <div className="meta-box mb-3">
                                    <div className="meta-header">AI Meta</div>
                                    <pre className="meta-pre">{prettyJSON(t.ai_meta ?? {})}</pre>
                                  </div>

                                  <div className="meta-box mb-3">
                                    <div className="meta-header">Extra</div>
                                    <pre className="meta-pre">{prettyJSON(t.extra ?? {})}</pre>
                                  </div>

                                  <div className="d-grid gap-2">
                                    {/* <Button variant="outline-secondary" size="sm" onClick={(e) => { e.stopPropagation(); openTaskDetail(t); }}>
                                      Open Task Page
                                    </Button> */}

                                    {/* REVIEW BUTTON: navigates to a review page for this task */}
                                    <Button variant="outline-success" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/task-review/${id}`); }}>
                                      Review Task
                                    </Button>

                                    {/* <Button variant="outline-primary" size="sm" onClick={(e) => {
                                      e.stopPropagation();
                                      const txt = prettyJSON({ ai_meta: t.ai_meta, extra: t.extra });
                                      navigator.clipboard?.writeText(txt).then(() => alert("Copied AI meta + extra to clipboard")).catch(() => alert("Copy failed"));
                                    }}>
                                      Copy AI meta
                                    </Button> */}
                                    <Button variant="light" size="sm" onClick={(e) => { e.stopPropagation(); toggleExpand(t); }}>
                                      Close
                                    </Button>
                                  </div>
                                </div>
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

          {pageInfo && (pageInfo.next || pageInfo.previous) && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div><small className="text-muted">Total: {pageInfo.count ?? "-"}</small></div>
              <div>
                <Button variant="outline-secondary" size="sm" className="me-2" onClick={goPrev} disabled={!pageInfo.previous}>← Prev</Button>
                <Button variant="outline-secondary" size="sm" onClick={goNext} disabled={!pageInfo.next}>Next →</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        :global(body) {
          --page-bg-00: #e9fdfb; /* pale aqua like your screenshot */
          --card-bg: #ffffff;
          background: linear-gradient(180deg, var(--page-bg-00) 0%, #f6fffd 100%);
          -webkit-font-smoothing: antialiased;
          font-family: Inter, "Helvetica Neue", Arial, sans-serif;
        }

        .header-card {
          background: linear-gradient(90deg, rgba(120,94,200,0.06), rgba(160,120,255,0.03));
          border-radius: 12px;
          align-items: center;
          border: 1px solid rgba(10,12,15,0.03);
        }

        .list-card {
          border-radius: 10px;
          padding: 0.5rem;
          background: transparent;
          border: none;
        }

        .custom-table-wrap { overflow: auto; }

        /* ===== Table style to match your screenshot ===== */
        :global(.table) {
          width: 100%;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          background: transparent;
          margin-bottom: 0;
          font-size: 14px;
        }

        /* header: solid purple bar with white text and rounded corners */
        :global(.table thead th) {
          background: linear-gradient(90deg,#6f2bd6,#4e1fb3) !important;
          color: #fff !important;
          font-weight: 700 !important;
          padding: 12px 14px !important;
          border: none !important;
          vertical-align: middle !important;
        }
        :global(.table thead th:first-child) { border-top-left-radius: 8px; }
        :global(.table thead th:last-child) { border-top-right-radius: 8px; }

        /* table body rows — pale lavender fill like screenshot */
        :global(.table tbody td) {
          background: rgba(113,54,178,0.05) !important; /* very light lavender */
          padding: 10px 14px !important;
          color: #2b2b2b !important;
          border-top: 1px solid rgba(75,0,130,0.05) !important;
          vertical-align: middle !important;
        }

        /* make the first data row slightly stronger — creates a boxed row look */
        :global(.table tbody tr:first-child td) { background: rgba(113,54,178,0.08) !important; }

        /* remove default table borders that conflict with the look */
        :global(.table-bordered) { border: none !important; }
        :global(.table-bordered td), :global(.table-bordered th) { border: none !important; }

        /* hover — keep subtle purple tint */
        .row-main:hover td { background: rgba(113,54,178,0.12) !important; }

        .task-title { color: #0f1724; font-weight: 700; }

        /* AI badge: blue pill for suggested, yellow small for locked */
        .ai-badge {
          background: linear-gradient(90deg,#5cc3ff,#28a3ff) !important;
          color: #042a3a !important;
          font-weight: 700;
          border-radius: 999px;
          padding: 0.25em 0.6em;
          font-size: 12px;
        }

        .badge.locked {
          background: #ffd84d !important;
          color: #4a3000 !important;
          font-weight: 700;
          border-radius: 6px;
          padding: 0.15em 0.5em;
          font-size: 12px;
        }

        /* small muted text under titles */
        .text-muted { color: rgba(15,23,42,0.45) !important; }

        /* detail row container to appear white and elevated slightly */
        .detail-cell {
          background: #fff !important;
          border-top: none !important;
          box-shadow: 0 6px 18px rgba(35, 31, 32, 0.03);
          border-radius: 0 0 8px 8px;
        }

        .detail-table th { width: 34%; background: #faf7ff; }

        .meta-box { background: #fff; border: 1px solid rgba(0,0,0,0.04); padding: 8px; border-radius: 8px; }
        .meta-pre { background: #fafaff; padding: 8px; border-radius: 6px; max-height: 200px; overflow: auto; }

        /* buttons (fallbacks) */
        .g-btn { background: linear-gradient(90deg, #6f42c1, #8e44ad); color: white; border: none; padding: 8px 14px; border-radius: 8px; }
        .g-btn-secondary { background: white; color: #333; border: 1px solid rgba(0,0,0,0.06); padding: 8px 12px; border-radius: 8px; }

        /* responsive stacked view for very small screens */
        @media (max-width: 880px) {
          .table thead { display: none; }
          .table, .table tbody, .table tr, .table td { display: block; width: 100%; }
          .table tr { margin-bottom: 0.8rem; border-radius: 8px; }
          .table td { display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; border-radius: 8px; background: #fff; box-shadow: 0 6px 18px rgba(35, 31, 32, 0.03); margin-bottom: 8px; }
        }
      `}</style>
    </div>
  );
}
