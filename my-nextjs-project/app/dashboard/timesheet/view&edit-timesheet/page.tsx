"use client";
export const dynamic = "force-dynamic";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect, FormEvent, useMemo } from "react";
import {
  Nav,
  Table,
  Modal,
  Button,
  Form,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

type MaybeObj<T> = T | number;
interface UserObj { id: number; username?: string; is_staff?: boolean }
interface TimeRequest {
  id: number;
  user: MaybeObj<UserObj> | string; // StringRelatedField might return string
  user_id?: number;
  project: MaybeObj<{ id: number; name: string; created_by?: MaybeObj<UserObj> }>;
  project_owner?: number | null;
  task: MaybeObj<{ id: number; title: string }>;
  date: string;
  time_from: string;
  time_to: string;
  requested_duration: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  // NEW optional server flags
  is_creator?: boolean;
  can_approve?: boolean;
  can_delete?: boolean;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
}

interface CurrentUser {
  id: number;
  username?: string;
  is_staff?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(^|;)\\s*${name}=\\s*([^;]+)`));
  return match ? match[2] : "";
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("token") || "";
  if (!raw) return null;
  return raw.replace(/^"|"$/g, "");
}

function getAuthOptions() {
  const token = readToken();
  const csrftoken = getCookie("csrftoken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Token ${token}`;
    return { headers } as const;
  }
  if (csrftoken) {
    headers["X-CSRFToken"] = csrftoken;
  }
  return { headers, credentials: "include" as const };
}

export default function TimeRequestTabs() {
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [requests, setRequests] = useState<Record<string, TimeRequest[]>>({
    PENDING: [],
    APPROVED: [],
    REJECTED: [],
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskMap, setTaskMap] = useState<Record<number, Task>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editRequest, setEditRequest] = useState<TimeRequest | null>(null);
  const [formData, setFormData] = useState({
    project: null as Project | null,
    task: null as Task | null,
    date: "",
    timeFrom: "",
    timeTo: "",
    description: "",
    status: "PENDING" as "PENDING" | "APPROVED" | "REJECTED",
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // helpers to extract ids from possibly-nested fields
  const getUserId = (u: MaybeObj<UserObj> | string | undefined, fallbackUserId?: number | undefined) => {
    if (typeof fallbackUserId === "number") return fallbackUserId;
    if (typeof u === "number") return u;
    if (typeof u === "object") return (u as UserObj).id ?? null;
    return null;
  };

  const getProjectOwnerIdFromProject = (p: any) => {
    if (!p) return null;
    if (typeof p === "object") {
      const cb = (p as any).created_by;
      if (!cb) return null;
      return typeof cb === "number" ? cb : cb?.id ?? null;
    }
    return null;
  };

  // load current user: try a few common endpoints; adjust if your API exposes a different one
  const loadCurrentUser = async () => {
    const endpoints = [
      `${API_BASE_URL.replace(/\/api\/?$/, "")}/api/users/me/`,
      `${API_BASE_URL}/users/me/`,
      `${API_BASE_URL.replace(/\/api\/?$/, "")}/auth/user/`,
      `${API_BASE_URL}/auth/user/`,
      `${API_BASE_URL}/whoami/`,
    ];
    const opts = getAuthOptions();
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { method: "GET", ...opts });
        if (!res.ok) continue;
        const j = await res.json();
        const id = j.id ?? j.user_id ?? j.pk;
        const is_staff = j.is_staff ?? j.staff ?? j.isAdmin ?? j.is_superuser;
        if (id) {
          setCurrentUser({ id, username: j.username, is_staff: !!is_staff });
          return;
        }
      } catch (e) {
        // ignore and try next
      }
    }
    // fallback: leave currentUser null
  };

  // populate taskMap when API returns only ids
  const populateTaskMap = async (list: TimeRequest[]) => {
    const numericTaskIds = Array.from(
      new Set(
        list
          .map((r) => (typeof r.task === "number" ? (r.task as number) : null))
          .filter((id): id is number => id !== null)
      )
    ).filter((id) => !(id in taskMap));
    if (numericTaskIds.length === 0) return;

    try {
      const opts = getAuthOptions();
      const fetches = numericTaskIds.map((id) =>
        fetch(`${API_BASE_URL}/tasks/${id}/`, { ...opts }).then(async (res) => {
          if (!res.ok) throw new Error(`task fetch ${id} failed ${res.status}`);
          return res.json();
        })
      );
      const results = await Promise.all(fetches);
      setTaskMap((m) => {
        const copy = { ...m };
        results.forEach((t: any) => {
          if (t && t.id) copy[t.id] = t;
        });
        return copy;
      });
    } catch (err) {
      console.warn("populateTaskMap failed:", err);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const opts = getAuthOptions();
      const res = await fetch(`${API_BASE_URL}/time-requests/`, {
        method: "GET",
        ...opts,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const json = await res.json();
      const list: TimeRequest[] = Array.isArray(json) ? json : json.results ?? [];
      const grouped = { PENDING: [], APPROVED: [], REJECTED: [] } as Record<string, any>;
      list.forEach((r) => grouped[r.status].push(r));
      setRequests(grouped);
      await populateTaskMap(list);
    } catch (e) {
      console.error("loadRequests failed:", e);
      setRequests({ PENDING: [], APPROVED: [], REJECTED: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const opts = getAuthOptions();
      const res = await fetch(`${API_BASE_URL}/projects/`, {
        ...opts,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      setProjects(await res.json());
    } catch (e) {
      console.error("loadProjects failed:", e);
      setProjects([]);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadRequests();
    loadProjects();
  }, []);

  // tasks for form
  useEffect(() => {
    if (!formData.project) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const opts = getAuthOptions();
        const res = await fetch(`${API_BASE_URL}/tasks/?project=${formData.project!.id}`, { ...opts });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
        setTasks(await res.json());
      } catch (e) {
        console.error("loadTasks failed:", e);
        setTasks([]);
      }
    })();
  }, [formData.project]);

  const getProjectName = (r: TimeRequest) => {
    if (!r.project && r.project !== 0) return "—";
    if (typeof r.project === "object") return r.project.name ?? "—";
    const p = projects.find((pp) => pp.id === r.project);
    return p ? p.name : String(r.project);
  };

  const getTaskTitle = (r: TimeRequest) => {
    if (!r.task && r.task !== 0) return "—";
    if (typeof r.task === "object") return r.task.title ?? "—";
    const t = taskMap[r.task as number];
    return t ? t.title : String(r.task);
  };

  const openAdd = () => {
    setEditRequest(null);
    setFormData({ project: null, task: null, date: "", timeFrom: "", timeTo: "", description: "", status: "PENDING" });
    setShowModal(true);
  };

  const openEdit = (r: TimeRequest) => {
    setEditRequest(r);
    setFormData({
      project: typeof r.project === "object" ? r.project : (projects.find(p => p.id === (r.project as number)) ?? null),
      task: typeof r.task === "object" ? r.task : (taskMap[(r.task as number)] ?? null),
      date: r.date,
      timeFrom: r.time_from.slice(0, 5),
      timeTo: r.time_to.slice(0, 5),
      description: r.description,
      status: r.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.project || !formData.task) {
      console.error("project and task required");
      return;
    }
    const [h1, m1] = formData.timeFrom.split(":");
    const [h2, m2] = formData.timeTo.split(":");
    const payload = {
      project: formData.project.id,
      task: formData.task.id,
      date: formData.date,
      time_from: `${h1.padStart(2, "0")}:${m1.padStart(2, "0")}:00`,
      time_to: `${h2.padStart(2, "0")}:${m2.padStart(2, "0")}:00`,
      description: formData.description,
      status: formData.status,
    };
    const url = editRequest ? `${API_BASE_URL}/time-requests/${editRequest.id}/` : `${API_BASE_URL}/time-requests/`;
    const method = editRequest ? "PATCH" : "POST";
    try {
      const opts = getAuthOptions();
      const res = await fetch(url, {
        method,
        ...opts,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        let message = text;
        try { message = JSON.stringify(JSON.parse(text)); } catch {}
        throw new Error(`Save failed: ${res.status} ${message}`);
      }
      await loadRequests();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  // NEW canEditOrDelete: disallow for project owner (recipient); allow for creator and staff
  const canEditOrDelete = (r: TimeRequest) => {
    // require current user known
    if (!currentUser) return false;

    // staff should keep full power
    if (currentUser.is_staff) return true;

    // if current user is the project owner (the recipient) -> explicitly disallow
    const ownerId = (r.project_owner ?? getProjectOwnerIdFromProject(typeof r.project === "object" ? r.project : null)) as number | null;
    if (ownerId && ownerId === currentUser.id) return false;

    // prefer server-provided flag if present
    if (typeof r.can_delete === "boolean") return !!r.can_delete;
    if (typeof r.is_creator === "boolean") return !!r.is_creator;

    // fallback to ID comparison (creator)
    const uid = (r.user_id ?? (typeof r.user === "object" ? (r.user as UserObj).id : undefined)) as number | undefined;
    if (!uid) return false;
    return uid === currentUser.id;
  };

  const canApproveOrReject = (r: TimeRequest) => {
    if (typeof r.can_approve === "boolean") return !!r.can_approve;

    if (!currentUser) return false;
    if (currentUser.is_staff) return true;

    // Prefer explicit project_owner field when provided
    const ownerId = (r.project_owner ?? getProjectOwnerIdFromProject(typeof r.project === "object" ? r.project : null)) as number | null;
    if (ownerId && ownerId === currentUser.id) return true;

    return false;
  };

  // PATCH to change status to APPROVED / REJECTED
  const patchStatus = async (id: number, statusVal: "APPROVED" | "REJECTED") => {
    setActionLoading(s => ({ ...s, [id]: true }));
    try {
      const opts = getAuthOptions();
      const res = await fetch(`${API_BASE_URL}/time-requests/${id}/`, {
        method: "PATCH",
        ...opts,
        body: JSON.stringify({ status: statusVal }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Status update failed ${res.status}: ${t}`);
      }
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setActionLoading(s => ({ ...s, [id]: false }));
    }
  };

  // Approve/Reject now act directly (no confirm)
  const handleApprove = (r: TimeRequest) => {
    if (!canApproveOrReject(r)) {
      alert("Not allowed");
      return;
    }
    // direct approve
    void patchStatus(r.id, "APPROVED");
  };

  const handleReject = (r: TimeRequest) => {
    if (!canApproveOrReject(r)) {
      alert("Not allowed");
      return;
    }
    // direct reject
    void patchStatus(r.id, "REJECTED");
  };

  const handleDelete = async (r: TimeRequest) => {
    if (!canEditOrDelete(r)) return alert("Not allowed");
    if (!confirm("Delete this time request? This cannot be undone.")) return;
    setActionLoading(s => ({ ...s, [r.id]: true }));
    try {
      const opts = getAuthOptions();
      const res = await fetch(`${API_BASE_URL}/time-requests/${r.id}/`, {
        method: "DELETE",
        ...opts,
      });
      if (res.status !== 204 && !res.ok) {
        const t = await res.text();
        throw new Error(`Delete failed ${res.status}: ${t}`);
      }
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setActionLoading(s => ({ ...s, [r.id]: false }));
    }
  };

  const renderActions = (r: TimeRequest) => {
    const editAllowed = canEditOrDelete(r);
    const approveAllowed = canApproveOrReject(r) && r.status === "PENDING";
    const rejectAllowed = canApproveOrReject(r) && r.status === "PENDING";
    const busy = !!actionLoading[r.id];

    return (
      <div className="d-flex gap-2">
        <Button size="sm" variant="outline-primary" onClick={() => editAllowed ? openEdit(r) : alert("Not allowed")} disabled={!editAllowed}>
          Edit
        </Button>

        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(r)} disabled={!editAllowed || busy}>
          {busy ? "..." : "Delete"}
        </Button>

        {approveAllowed && (
          <Button size="sm" className="btn btn-success" onClick={() => handleApprove(r)} disabled={busy}>
            {actionLoading[r.id] ? "..." : "Approve"}
          </Button>
        )}

        {rejectAllowed && (
          <Button size="sm" className="btn btn-danger" onClick={() => handleReject(r)} disabled={busy}>
            {actionLoading[r.id] ? "..." : "Reject"}
          </Button>
        )}
      </div>
    );
  };

  // dynamic counts for cards
  const counts = useMemo(() => {
    const p = (requests.PENDING || []).length;
    const a = (requests.APPROVED || []).length;
    const r = (requests.REJECTED || []).length;
    // Holiday heuristic: any approved request with "holiday" in description (case-insensitive)
    const h = (requests.APPROVED || []).filter(req => (req.description || "").toLowerCase().includes("holiday")).length;
    return { PENDING: p, APPROVED: a, REJECTED: r, HOLIDAY: h };
  }, [requests]);

  const cardDefs = [
    { key: 'APPROVED', title: 'Approved Request', border: 'border-blue', textClass: 'txt-clr-blue', count: counts.APPROVED, svg: (
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 0H2C0.9 0 0.0100002 0.9 0.0100002 2L0 18C0 19.1 0.89 20 1.99 20H14C15.1 20 16 19.1 16 18V6L10 0ZM6.94 16L3.4 12.46L4.81 11.05L6.93 13.17L11.17 8.93L12.58 10.34L6.94 16ZM9 7V1.5L14.5 7H9Z" fill="#2F6CE5" /></svg>
    ) },
    { key: 'PENDING', title: 'Pending Request', border: 'border-green', textClass: 'txt-clr-green', count: counts.PENDING, svg: (
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM3.55556 14.4H9.77778V12.6H3.55556V14.4ZM3.55556 10.8H12.4444V9H3.55556V10.8ZM3.55556 7.2H12.4444V5.4H3.55556V7.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#22C55E" /></svg>
    ) },
    { key: 'HOLIDAY', title: 'Holiday', border: 'border-yellow', textClass: 'txt-clr-yellow', count: counts.HOLIDAY, svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.02428 0.175747C0.78997 -0.0585756 0.410062 -0.0585837 0.175747 0.175731C-0.0585756 0.410046 -0.0585837 0.789954 0.175731 1.02427L4.85958 5.70822C4.3547 5.91968 4.00001 6.41847 4.00001 7.00008V8.00009H5.20002V7.00008L5.2053 6.95424C5.22603 6.86592 5.30534 6.80008 5.40002 6.80008H5.95145L7.94913 8.79778H1.39925C0.832154 8.79778 0.581575 9.51187 1.0243 9.86627L4.80001 12.8885V14.2038C4.80001 15.198 5.60591 16.0039 6.59999 16.0039H9.39635C10.3905 16.0039 11.1964 15.198 11.1964 14.2038V12.8884L11.6647 12.5134L14.9757 15.8246C15.21 16.0589 15.5899 16.0589 15.8243 15.8246C16.0586 15.5903 16.0586 15.2103 15.8243 14.976L1.02428 0.175747ZM10.8109 11.6597L10.2213 12.1318C10.0792 12.2457 9.99635 12.418 9.99635 12.6001V14.2038C9.99635 14.5352 9.72771 14.8038 9.39635 14.8038H6.59999C6.26866 14.8038 6.00003 14.5352 6.00003 14.2038V12.6001C6.00003 12.418 5.91723 12.2456 5.77497 12.1317L3.10901 9.99779H9.14906L10.8109 11.6597Z" fill="#D08700" /><path d="M8.00008 4.80005C7.72496 4.80005 7.46064 4.75376 7.21455 4.66852L5.73161 3.18559C5.64639 2.93945 5.6001 2.67514 5.6001 2.40003C5.6001 1.07452 6.67463 0 8.00008 0C9.32562 0 10.4001 1.07452 10.4001 2.40003C10.4001 3.72552 9.32562 4.80005 8.00008 4.80005ZM8.00008 1.20001C7.33736 1.20001 6.80007 1.73728 6.80007 2.40003C6.80007 3.06277 7.33736 3.60004 8.00008 3.60004C8.66289 3.60004 9.2001 3.06277 9.2001 2.40003C9.2001 1.73728 8.66289 1.20001 8.00008 1.20001Z" fill="#D08700" /></svg>
    ) },
    { key: 'REJECTED', title: 'Reject Request', border: 'border-red', textClass: 'txt-clr-red', count: counts.REJECTED, svg: (
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM3.55556 14.4H9.77778V12.6H3.55556V14.4ZM3.55556 10.8H12.4444V9H3.55556V10.8ZM3.55556 7.2H12.4444V5.4H3.55556V7.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#D00E00" /><path d="M15 2.5L1 17" stroke="#D00E00" stroke-width="2" /></svg>
    ) },
  ];

  const renderTable = (status: string) => {
    const colCount = status === 'PENDING' ? 10 : 9; // actions column only for pending
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="table-responsive">
              <Table className=" g-table min-w-13">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Project</th>
                    <th>Task</th>
                    <th>Date</th>
                    <th>Time From</th>
                    <th>Time To</th>
                    <th>Duration</th>
                    <th>Description</th>
                    <th>Status</th>
                    {status === 'PENDING' && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={colCount} className="text-center py-4">
                        <Spinner animation="border" size="sm" /> Loading...
                      </td>
                    </tr>
                  ) : requests[status]?.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="text-center py-3">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    requests[status]?.map((r, idx) => (
                      <tr key={r.id}>
                        <td>{idx + 1}</td>
                        <td>{getProjectName(r)}</td>
                        <td>{getTaskTitle(r)}</td>
                        <td>{r.date}</td>
                        <td>{r.time_from.slice(0, 5)}</td>
                        <td>{r.time_to.slice(0, 5)}</td>
                        <td>{r.requested_duration}</td>
                        <td title={r.description}>
                          {r.description.length > 25 ? r.description.slice(0, 25) + "..." : r.description}
                        </td>

                        <td>
                          <span
                            className={`badge ${r.status === "PENDING"
                                ? "bg-warning"
                                : r.status === "APPROVED"
                                  ? "bg-success"
                                  : "bg-danger"
                              }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        {status === 'PENDING' ? <td>{renderActions(r)}</td> : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid px-sm-0 py-4">
        <div className="d-flex align-items-center justify-content-between mb-4 ">
          <h2>Time Request</h2>
          <button className="g-btn" onClick={openAdd}>+ Add Request</button>
        </div>

        <div className="row mb-4 g-4">
          {cardDefs.map((c) => (
            <div className="col-md-3 col-sm-6" key={c.key}>
              <div className={`card g-card ${c.border}`} role="button" title={c.title}>
                <div className="icon mb-2 d-flex align-items-center justify-content-between">
                  <small className={c.textClass}>{c.title}</small>
                  {c.svg}
                </div>
                <div className="count">
                  <h5 className={`mb-0 fw-bold ${c.textClass}`}>{c.count}</h5>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <Spinner animation="border" />
        ) : (
          <>
            <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as any)}>
              <Nav.Item>
                <Nav.Link eventKey="PENDING">Pending</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="APPROVED">Approved</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="REJECTED">Rejected</Nav.Link>
              </Nav.Item>
            </Nav>
            <div className="row">
              <div className="col-lg-12">
                <h5 className="mt-4">Time Request Data</h5>
              </div>
            </div>
            {renderTable(activeTab)}
          </>
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form className="g-modal-conntent-wrapper" onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editRequest ? "Edit Request" : "Add Request"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Project</Form.Label>
                <Dropdown
                  value={formData.project}
                  options={projects}
                  onChange={(e: any) => {
                    setFormData({ ...formData, project: e.value, task: null });
                  }}
                  optionLabel="name"
                  placeholder="Select a Project"
                  filter
                  showClear
                  className="w-100"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Task</Form.Label>
                <Dropdown
                  value={formData.task}
                  options={tasks}
                  onChange={(e: any) => setFormData({ ...formData, task: e.value })}
                  optionLabel="title"
                  placeholder="Select a Task"
                  filter
                  showClear
                  className="w-100"
                  disabled={!formData.project}
                />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </Col>
              <Col md={6}>
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Time From</Form.Label>
                <Form.Control
                  type="time"
                  value={formData.timeFrom}
                  onChange={(e) => setFormData({ ...formData, timeFrom: e.target.value })}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Time To</Form.Label>
                <Form.Control
                  type="time"
                  value={formData.timeTo}
                  onChange={(e) => setFormData({ ...formData, timeTo: e.target.value })}
                  required
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <button className="g-btn" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="g-btn" type="submit">
              {editRequest ? "Update" : "Add"}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
