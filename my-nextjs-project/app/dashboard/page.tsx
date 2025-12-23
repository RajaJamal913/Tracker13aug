// app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Form } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

/* --------------------------- Chart data (unchanged) --------------------------- */
const barData = [
  { name: "Mon", hours: 8 },
  { name: "Mon", hours: 6.5 },
  { name: "Mon", hours: 6.5 },
  { name: "Thu", hours: 6 },
  { name: "Fri", hours: 8 },
  { name: "Fri", hours: 3 },
  { name: "Fri", hours: 3 },
];

const pieData = [
  { name: "Completed", value: 45 },
  { name: "In Progress", value: 30 },
  { name: "Overdue", value: 10 },
  { name: "Pending", value: 15 },
];
const statusData = [
  { month: "Apr", completed: 20, inProgress: 30, pending: 10 },
  { month: "May", completed: 40, inProgress: 50, pending: 20 },
  { month: "Jun", completed: 60, inProgress: 45, pending: 25 },
  { month: "Jul", completed: 70, inProgress: 35, pending: 40 },
  { month: "Aug", completed: 75, inProgress: 70, pending: 20 },
  { month: "Sep", completed: 45, inProgress: 65, pending: 70 },
];
const COLORS = ["#16a34a", "#3b82f6", "#ef4444", "#fbbf24"];

/* --------------------------- API base & helpers --------------------------- */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const LOGIN_ROUTE = "/userLogin"; // adjust if your login path differs

async function getWhoami(signal?: AbortSignal) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Token ${token}`; // change to Bearer if using JWT
  const res = await fetch(`${API_BASE}/api/auth/whoami/`, { method: "GET", headers, signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error(`whoami failed: ${res.status} ${txt}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function saveUserRole(payload: {
  role: string;
  experience?: number | null;
  skills?: string;
  developer_type?: string | null;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`; // change if needed
  const res = await fetch(`${API_BASE}/api/user/role/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`save role failed: ${res.status} ${txt}`);
  }
  return res.json();
}

/* --------------------------- Role selector modal component --------------------------- */
function RoleSelectorModal({
  show,
  onConfirm,
  onClose,
}: {
  show: boolean;
  onConfirm: (role: string, details?: { experience?: string; skills?: string; developerType?: string }) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [experience, setExperience] = useState<string>("");
  const [skills, setSkills] = useState<string>("");
  const [developerType, setDeveloperType] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setSelected(null);
      setExperience("");
      setSkills("");
      setDeveloperType(null);
    } else {
      // If session already had values, prefill them (whoami populates sessionStorage)
      const storedRole = sessionStorage.getItem("userRole");
      if (storedRole) setSelected(storedRole);
      const storedExp = sessionStorage.getItem("userExperience");
      const storedSkills = sessionStorage.getItem("userSkills");
      const storedDevType = sessionStorage.getItem("userDeveloperType");
      if (storedExp) setExperience(storedExp);
      if (storedSkills) setSkills(storedSkills);
      if (storedDevType) setDeveloperType(storedDevType);
    }
  }, [show]);

  // require developerType too when member selected
  const isContinueDisabled = !selected || (selected === "member" && (!experience.trim() || !skills.trim() || !developerType));

  return (
    <Modal contentClassName="border-0 rounded-4 g-shadow g-modal-conntent-wrapper" show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Select your role for this session</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Please confirm whether you are a Project Owner, Project Manager or Member. This will apply for the current login session.</p>
        <Form>
          <Form.Check type="radio" id="role-owner" name="userRole" label="Project Owner" checked={selected === "owner"} onChange={() => setSelected("owner")} className="mb-2" />
          <Form.Check type="radio" id="role-manager" name="userRole" label="Project Manager" checked={selected === "manager"} onChange={() => setSelected("manager")} className="mb-2" />
          <Form.Check type="radio" id="role-member" name="userRole" label="Member" checked={selected === "member"} onChange={() => setSelected("member")} className="mb-2" />

          {selected === "member" && (
            <>
              <hr />
              <Form.Group className="mb-2" controlId="memberExperience">
                <Form.Label>Years of experience</Form.Label>
                <Form.Control type="number" min={0} placeholder="e.g. 3" value={experience} onChange={(e) => setExperience(e.target.value)} />
              </Form.Group>

              <Form.Group controlId="memberSkills" className="mb-2">
                <Form.Label>Skills (comma separated)</Form.Label>
                <Form.Control as="textarea" rows={3} placeholder="e.g. React, Django, Postgres" value={skills} onChange={(e) => setSkills(e.target.value)} />
                <Form.Text className="text-muted">List a few key skills or tools you work with.</Form.Text>
              </Form.Group>

              <Form.Group controlId="memberDeveloperType" className="mb-2">
                <Form.Label>Developer type</Form.Label>
                <Form.Select value={developerType ?? ""} onChange={(e) => setDeveloperType(e.target.value || null)}>
                  <option value="">Select developer type</option>
                  <option value="web">Web Developer</option>
                  <option value="mobile">Mobile Developer</option>
                  <option value="uiux">UI/UX Designer</option>
                  <option value="other">Other</option>
                </Form.Select>
                <Form.Text className="text-muted">Choose the best fit for your primary role (required for members).</Form.Text>
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <button className="g-btn-secondary d-none" onClick={onClose}>
          Cancel
        </button>
        <button
          className="g-btn"
          onClick={() =>
            selected
              ? onConfirm(selected, selected === "member" ? { experience: experience.trim(), skills: skills.trim(), developerType: developerType ?? "" } : undefined)
              : undefined
          }
          disabled={isContinueDisabled}
        >
          Continue
        </button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------- Utilities for grouping & initials --------------------------- */
type TaskItem = {
  id?: number;
  title?: string;
  due_date?: string | null;
  status?: string;
  [k: string]: any;
};

function initialsFromName(name?: string | null) {
  if (!name) return "NA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* --------------------------- Main page component --------------------------- */
export default function Home() {
  const [username, setUsername] = useState<string>("Loading…");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignerGroups, setAssignerGroups] = useState<{ id: number | null; name: string; count: number; tasks: TaskItem[] }[]>([]);
  const [assignersLoading, setAssignersLoading] = useState<boolean>(false);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [outstandingCount, setOutstandingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number | null>(null); // <--- NEW state
  const router = useRouter();

  useEffect(() => {
    const ac = new AbortController();

    const getServerLastLogin = (data: any) => {
      return data?.last_login ?? data?.lastLogin ?? data?.last_login_at ?? null;
    };

    // helper: wait briefly for token (handles race where login sets token then navigates)
    const waitForToken = async (maxTries = 10, intervalMs = 100): Promise<string | null> => {
      for (let i = 0; i < maxTries; i++) {
        const t = localStorage.getItem("token");
        if (t) return t;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return null;
    };

    (async () => {
      try {
        const justLoggedIn = localStorage.getItem("justLoggedIn");
        let token = localStorage.getItem("token");

        // If the login page set the justLoggedIn flag, wait briefly for the token to appear
        if (!token && justLoggedIn === "1") {
          token = await waitForToken(10, 100); // wait up to ~1s
          localStorage.removeItem("justLoggedIn");
        }

        // If no token is present at this stage, DO NOT redirect immediately.
        // Redirect only when we have an explicit auth failure from whoami.
        if (!token) {
          console.warn("[Auth] No token yet; skipping immediate redirect. waiting for authenticated requests to run when token appears.");
          // We don't attempt whoami without a token; stop further logic here.
          // When token is set (e.g. login flow), this effect will NOT automatically re-run
          // unless the component re-mounts or login flow triggers navigation again.
          // Typically your login redirect should set token then navigate -> this avoids the race.
          return;
        }

        // call whoami (we have a token)
        let data;
        try {
          data = await getWhoami(ac.signal);
        } catch (err: any) {
          console.error("[Auth] whoami failed:", err?.message ?? err);

          // Only redirect to login if the server returned an explicit 401/unauthorized
          const status = (err && (err as any).status) || null;
          if (status === 401) {
            console.warn("[Auth] whoami returned 401 — redirecting to login.");
            router.push(LOGIN_ROUTE);
            return;
          }

          // For other errors (network, 5xx) we log and do not aggressively redirect.
          return;
        }

        setUsername(data.username ?? "User");

        // If server returned member_profile, stash it so the modal pre-fills
        if (data.member_profile) {
          const mp = data.member_profile;
          if (mp.role) sessionStorage.setItem("userRole", String(mp.role));
          if (mp.experience !== undefined && mp.experience !== null) sessionStorage.setItem("userExperience", String(mp.experience));
          if (mp.skills) sessionStorage.setItem("userSkills", String(mp.skills));
          if (mp.developer_type) sessionStorage.setItem("userDeveloperType", String(mp.developer_type));
        }

        // 1) If the login page explicitly set a flag after login, honor it (most robust)
        if (justLoggedIn === "1") {
          setRoleModalOpen(true);
          const serverLastLogin = getServerLastLogin(data);
          if (serverLastLogin) localStorage.setItem("lastLoginSeen", serverLastLogin);
          localStorage.setItem("lastTokenSeen", token);
          return;
        }

        // 2) Preferred: server-provided last_login timestamp detection
        const serverLastLogin = getServerLastLogin(data);
        if (serverLastLogin) {
          const prevSeen = localStorage.getItem("lastLoginSeen");
          if (prevSeen !== serverLastLogin) {
            // a new login was detected
            setRoleModalOpen(true);
            localStorage.setItem("lastLoginSeen", serverLastLogin);
            // (we don't set sessionStorage.roleAnswered here — wait for user's choice)
            return;
          } else {
            // not a new login — restore previously chosen role for this session if available
            const role = sessionStorage.getItem("userRole");
            if (role) setUserRole(role);
            return;
          }
        }

        // 3) Fallback: detect token change (works if token changes on each login)
        const prevTokenSeen = localStorage.getItem("lastTokenSeen");
        if (prevTokenSeen !== token) {
          // token changed => assume new login
          setRoleModalOpen(true);
          localStorage.setItem("lastTokenSeen", token);
          return;
        }

        // Final fallback: ask once per browser session (so users aren't spammed while navigating)
        const askedThisSession = sessionStorage.getItem("roleAnswered");
        if (!askedThisSession) {
          setRoleModalOpen(true);
        } else {
          const role = sessionStorage.getItem("userRole");
          if (role) setUserRole(role);
        }
      } catch (err) {
        console.error("[Auth] Unexpected error in auth effect:", err);
        // Only redirect for explicit auth problems; otherwise avoid spurious navigation
      }
    })();

    return () => ac.abort();
  }, [router]);

  /* --------------------------- NEW: fetch approved time-requests count --------------------------- */
  useEffect(() => {
    const ac = new AbortController();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const fetchApprovedCount = async () => {
      setApprovedCount(null); // show loading
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Token ${token}`;

        const res = await fetch(`${API_BASE}/api/time-requests/?status=APPROVED`, {
          method: "GET",
          headers,
          signal: ac.signal,
        });

        if (!res.ok) {
          // If unauthorized, optionally redirect or set 0
          if (res.status === 401) {
            // not redirecting here; leave as 0 and let auth flow handle redirect elsewhere
            setApprovedCount(0);
            return;
          }
          console.warn("[TimeRequests] fetch failed:", res.status);
          setApprovedCount(0);
          return;
        }

        const body = await res.json();
        const list = Array.isArray(body) ? body : body.results ?? [];
        // defensive: ensure only APPROVED counted
        const count = list.filter((r: any) => (r.status ?? "").toString().toUpperCase() === "APPROVED").length;
        setApprovedCount(count);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[TimeRequests] error fetching approved count:", err);
        setApprovedCount(0);
      }
    };

    // Only attempt fetch if token exists; otherwise set 0 (or null to indicate not checked)
    if (token) {
      void fetchApprovedCount();
    } else {
      setApprovedCount(0);
    }

    return () => ac.abort();
  }, []);

  /* --------------------------- NEW: fetch tasks & robust grouping by assigner --------------------------- */
  useEffect(() => {
    const ac = new AbortController();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      // nothing to do until token available
      return () => ac.abort();
    }

    const fetchMyTasks = async () => {
      setAssignersLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Token ${token}`;

        const res = await fetch(`${API_BASE}/api/tasks/my/`, { method: "GET", headers, signal: ac.signal });
        if (!res.ok) {
          if (res.status === 401) {
            router.push(LOGIN_ROUTE);
            return;
          }
          console.warn("[Tasks] fetch failed", res.status);
          setAssignerGroups([]);
          setOverdueCount(0);
          setOutstandingCount(0);
          return;
        }
        const tasks: TaskItem[] = await res.json();

        // DEBUG: inspect shape returned by API so you can adapt server -> client mapping if needed
        console.debug("[Tasks] raw tasks response sample:", tasks && tasks[0]);

        // compute overdue & outstanding counts
        // Consider a task "overdue" when the due_date exists and is strictly before today (local),
        // and task is not closed (not DONE/CLOSED).
        // Consider a task "outstanding" when due_date exists and is today or in future and task is not closed.
        const closedStatuses = new Set(["DONE", "CLOSED", "Completed".toUpperCase()]);
        let overdue = 0;
        let outstanding = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // local day boundary

        for (const t of tasks) {
          const dueRaw = (t as any).due_date ?? null;
          const statusRaw = ((t as any).status ?? "").toString().toUpperCase();

          if (!dueRaw) continue; // we only count tasks that have a due date per your request

          // parse date portion; new Date() handles ISO strings; set time to midnight for comparison
          const due = new Date(dueRaw);
          if (Number.isNaN(due.getTime())) continue;
          due.setHours(0, 0, 0, 0);

          if (!closedStatuses.has(statusRaw)) {
            if (due < today) {
              overdue += 1;
            } else {
              // due >= today and not closed
              outstanding += 1;
            }
          }
        }

        setOverdueCount(overdue);
        setOutstandingCount(outstanding);

        // Group by assigner. key is either numeric id or a name-based key when id missing.
        const map = new Map<string, { id: number | null; name: string; count: number; tasks: TaskItem[] }>();

        const getNameFromUserObject = (u: any) => {
          if (!u) return null;
          const first = u.first_name ?? u.firstName ?? null;
          const last = u.last_name ?? u.lastName ?? null;
          if (first || last) return `${first ?? ""} ${last ?? ""}`.trim();
          return u.username ?? u.email ?? u.name ?? null;
        };

        for (const t of tasks) {
          // many possible shapes:
          // - t.assigned_by (number)
          // - t.assigned_by (object with id / user nested)
          // - t.assigned_by_name (friendly)
          // - t.created_by / t.creator (legacy)
          let keyId: number | null = null;
          let keyName: string | null = null;

          // assigned_by as primitive id or nested member object
          const assignedBy = (t as any).assigned_by ?? null;
          if (assignedBy) {
            if (typeof assignedBy === "number") {
              keyId = Number(assignedBy) || null;
            } else if (typeof assignedBy === "object") {
              keyId = assignedBy.id ?? assignedBy.pk ?? keyId;
              // attempt to get nested user name
              keyName = (t as any).assigned_by_name ??
                        assignedBy.name ??
                        getNameFromUserObject(assignedBy.user) ??
                        assignedBy.username ??
                        assignedBy.display_name ??
                        keyName;
            }
          }

          // explicit assigned_by_name from serializer
          if (!keyName) {
            keyName = (t as any).assigned_by_name ?? (t as any).assignedByName ?? null;
          }

          // fallback to created_by / creator fields (legacy tasks)
          if (!keyId && !keyName) {
            const c = (t as any).created_by ?? (t as any).creator ?? (t as any).createdBy ?? null;
            if (c) {
              if (typeof c === "number") {
                keyId = Number(c) || null;
              } else if (typeof c === "object") {
                keyId = c.id ?? c.pk ?? keyId;
                keyName = getNameFromUserObject(c.user) ?? c.username ?? c.email ?? c.name ?? keyName;
              }
            }
            if (!keyName) keyName = (t as any).created_by_name ?? (t as any).creator_name ?? null;
          }

          // As last attempt, try nested shapes like assigned_by__user__first_name etc
          if (!keyName) {
            const first = (t as any)["assigned_by__user__first_name"] ?? (t as any)["assigned_by__user__firstName"] ?? null;
            const last = (t as any)["assigned_by__user__last_name"] ?? (t as any)["assigned_by__user__lastName"] ?? null;
            if (first || last) keyName = `${first ?? ""} ${last ?? ""}`.trim();
          }

          if (!keyName && !keyId) {
            keyName = "Unrecorded";
            keyId = null;
          }

          const mapKey = keyId !== null ? `id:${keyId}` : `name:${keyName}`;

          if (!map.has(mapKey)) {
            map.set(mapKey, { id: keyId, name: keyName ?? "Unknown", count: 0, tasks: [] });
          }
          const entry = map.get(mapKey)!;
          entry.tasks.push(t);
          entry.count = entry.tasks.length;
        }

        const groups = Array.from(map.values()).sort((a, b) => b.count - a.count);
        setAssignerGroups(groups);
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          // ignore
        } else {
          console.error("[Tasks] error fetching tasks:", err);
          setAssignerGroups([]);
          setOverdueCount(0);
          setOutstandingCount(0);
        }
      } finally {
        setAssignersLoading(false);
      }
    };

    fetchMyTasks();

    return () => ac.abort();
  }, [router]);

  // Handler when user confirms role in modal
  const handleRoleConfirm = (role: string, details?: { experience?: string; skills?: string; developerType?: string }) => {
    // store for this session only (ask every login): use sessionStorage
    sessionStorage.setItem("userRole", role);
    sessionStorage.setItem("roleAnswered", "1"); // prevents re-asking until session ends
    setUserRole(role);

    if (role === "member" && details) {
      sessionStorage.setItem("userExperience", details.experience ?? "");
      sessionStorage.setItem("userSkills", details.skills ?? "");
      sessionStorage.setItem("userDeveloperType", details.developerType ?? "");
    } else {
      // remove any previous member-specific data
      sessionStorage.removeItem("userExperience");
      sessionStorage.removeItem("userSkills");
      sessionStorage.removeItem("userDeveloperType");
    }

    setRoleModalOpen(false);

    // Persist server-side: POST to your Django endpoint using helper
    const payload: any = { role };
    if (role === "member") {
      const exp = details?.experience ? Number(details.experience) : null;
      payload.experience = Number.isNaN(exp) ? null : exp;
      payload.skills = details?.skills ?? "";
      payload.developer_type = details?.developerType ?? null;
    } else {
      payload.experience = null;
      payload.skills = "";
      payload.developer_type = null;
    }

    saveUserRole(payload)
      .then((json) => {
        console.log("Saved member profile on backend:", json);
        // keep local sessionStorage in-sync with server-validated values
        if (json.role) sessionStorage.setItem("userRole", String(json.role));
        if (json.experience !== undefined && json.experience !== null) sessionStorage.setItem("userExperience", String(json.experience));
        if (json.skills) sessionStorage.setItem("userSkills", String(json.skills));
        if (json.developer_type) sessionStorage.setItem("userDeveloperType", String(json.developer_type));
      })
      .catch((err) => {
        console.warn("Could not save role to backend:", err);
        // Optional: show UI toast here to inform user; currently just logs
      });
  };

  const handleRoleCancel = () => {
    // If user cancels — default to "member" (keep behaviour you had)
    sessionStorage.setItem("userRole", "member");
    sessionStorage.setItem("roleAnswered", "1");
    setUserRole("member");

    // don't set experience/skills/devtype (user cancelled), but you could set defaults if desired
    sessionStorage.removeItem("userExperience");
    sessionStorage.removeItem("userSkills");
    sessionStorage.removeItem("userDeveloperType");

    setRoleModalOpen(false);
  };

  /* --------------------------- Date strings (kept) --------------------------- */
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  /* --------------------------- UI content (kept as-is) --------------------------- */
  return (
    <>
      <RoleSelectorModal show={roleModalOpen} onConfirm={handleRoleConfirm} onClose={handleRoleCancel} />

      <main className=" min-vh-100">
        <div className="container-fluid">
          {/* Info Cards */}
          <div className="mb-4 row sprints-wrapper g-4 mt-4">
            <div className="col-lg-12">
              <div className="d-flex align-items-center gap-3">
                <FileText className="text-primary" size={24} />
                <h1 className="h4 mb-0" style={{ color: "#0066cc" }}>
                  Time Estimation Accuracy
                </h1>
              </div>
            </div>

            {/* Top three small cards */}
            <div className="col-lg-4">
              <div className="card border-0">
                <div className="card-body">
                  <h5 className="card-title" style={{ color: "#333" }}>
                    Code Reviews
                  </h5>
                  <p className="card-text" style={{ color: "#0066cc", fontSize: "0.9rem" }}>
                    Required for all PRs
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0">
                <div className="card-body">
                  <h5 className="card-title" style={{ color: "#333" }}>
                    Daily Standups
                  </h5>
                  <p className="card-text" style={{ color: "#0066cc", fontSize: "0.9rem" }}>
                    Every day at 9:00 AM PST
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0">
                <div className="card-body">
                  <h5 className="card-title" style={{ color: "#333" }}>
                    Sprint Duration
                  </h5>
                  <p className="card-text" style={{ color: "#0066cc", fontSize: "0.9rem" }}>
                    2 weeks per sprint cycle
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* First Row */}
          <div className="row mb-4 g-4">
            {/* Tasks by Assignee (now dynamic by assigner) */}
            <div className="col-lg-3 col-md-4 col-sm-6">
              <div className="card h-100 task-by-assignee rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="me-2" style={{ width: "20px", height: "20px" }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.25 15.7502V14.2502C17.2495 13.5855 17.0283 12.9397 16.621 12.4144C16.2138 11.889 15.6436 11.5138 15 11.3477" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.75 15.75V14.25C12.75 13.4544 12.4339 12.6913 11.8713 12.1287C11.3087 11.5661 10.5457 11.25 9.75 11.25H3.75C2.95435 11.25 2.19129 11.5661 1.62868 12.1287C1.06607 12.6913 0.75 13.4544 0.75 14.25V15.75" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 2.34766C12.6453 2.51288 13.2173 2.88818 13.6257 3.41439C14.0342 3.9406 14.2559 4.58778 14.2559 5.25391C14.2559 5.92003 14.0342 6.56722 13.6257 7.09342C13.2173 7.61963 12.6453 7.99493 12 8.16016" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.75 8.25C8.40685 8.25 9.75 6.90685 9.75 5.25C9.75 3.59315 8.40685 2.25 6.75 2.25C5.09315 2.25 3.75 3.59315 3.75 5.25C3.75 6.90685 5.09315 8.25 6.75 8.25Z" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h6 className="card-title mb-0 text-secondary" style={{ fontSize: "14px" }}>
                      Tasks by Assignee
                    </h6>
                  </div>

                  <div className="mt-4">
                    {assignersLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border" role="status" aria-hidden="true"></div>
                      </div>
                    ) : assignerGroups.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="mb-0 text-secondary">No task assigned to you by assignee</p>
                      </div>
                    ) : (
                      <>
                        {assignerGroups.slice(0, 5).map((g) => (
                          <div className="mb-3" key={`${g.id ?? "null"}-${g.name}`}>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle me-2 assignee-round" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                                {initialsFromName(g.name)}
                              </div>
                              <span className="flex-grow-1" style={{ fontSize: "14px" }}>
                                {g.name}
                              </span>
                              <span className="num text-secondary" style={{ fontSize: "12px" }}>
                                {g.count} task{g.count > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        ))}

                        <div className="mt-4 pt-2 border-top">
                          <a href="dashboard/MyTask" className="text-decoration-none text-secondary" style={{ fontSize: "13px" }}>
                            View all assignees →
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Overdue Tasks (dynamic) */}
            <div className="col-lg-3 col-md-4 col-sm-6">
              <div className="card h-100 overdue-task rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                     <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.45703 4.17773V9.17773M8.45703 11.1777V11.6777V10.6777M14.7632 14.1777H1.70239C0.929648 14.1777 0.448903 13.3387 0.839695 12.672L7.56799 1.19433C7.96018 0.525304 8.93164 0.537959 9.30627 1.21698L15.6388 12.6947C16.0065 13.3611 15.5244 14.1777 14.7632 14.1777Z" stroke="#CA262B" strokeWidth="1.4"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2">Overdue Tasks</h6>
                  </div>

                  <h2 className="fw-bold mb-2">{overdueCount}</h2>
                  <p className="mb-3" style={{ fontSize: "14px" }}>
                    Require immediate attention
                  </p>
                  <button className="btn btn-sm w-100" onClick={() => router.push("/dashboard/MyTask")}>View Details</button>
                </div>
              </div>
            </div>

            {/* No Time Estimate (DYNAMIC approved count shown here) */}
            <div className="col-lg-3 col-md-4 col-sm-6">
              <div className="card h-100 no-time-estimate rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.0833 12.25L12.25 11.0833L9.16667 8V4.16667H7.5V8.66667L11.0833 12.25ZM8.33333 16.6667C7.18056 16.6667 6.09722 16.4479 5.08333 16.0104C4.06944 15.5729 3.1875 14.9792 2.4375 14.2292C1.6875 13.4792 1.09375 12.5972 0.65625 11.5833C0.21875 10.5694 0 9.48611 0 8.33333C0 7.18056 0.21875 6.09722 0.65625 5.08333C1.09375 4.06944 1.6875 3.1875 2.4375 2.4375C3.1875 1.6875 4.06944 1.09375 5.08333 0.65625C6.09722 0.21875 7.18056 0 8.33333 0C9.48611 0 10.5694 0.21875 11.5833 0.65625C12.5972 1.09375 13.4792 1.6875 14.2292 2.4375C14.9792 3.1875 15.5729 4.06944 16.0104 5.08333C16.4479 6.09722 16.6667 7.18056 16.6667 8.33333C16.6667 9.48611 16.4479 10.5694 16.0104 11.5833C15.5729 12.5972 14.9792 13.4792 14.2292 14.2292C13.4792 14.9792 12.5972 15.5729 11.5833 16.0104C10.5694 16.4479 9.48611 16.6667 8.33333 16.6667ZM8.33333 15C10.1806 15 11.7535 14.3507 13.0521 13.0521C14.3507 11.7535 15 10.1806 15 8.33333C15 6.48611 14.3507 4.91319 13.0521 3.61458C11.7535 2.31597 10.1806 1.66667 8.33333 1.66667C6.48611 1.66667 4.91319 2.31597 3.61458 3.61458C2.31597 4.91319 1.66667 6.48611 1.66667 8.33333C1.66667 10.1806 2.31597 11.7535 3.61458 13.0521C4.91319 14.3507 6.48611 15 8.33333 15Z" fill="#B27626"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      No Time Estimate
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">
                    {approvedCount === null ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      approvedCount
                    )}
                  </h2>
                  <p className=" mb-3" style={{ fontSize: "14px" }}>
                    Tasks need estimation
                  </p>
                  <button type="button" className="btn btn-outline-warning btn-sm w-100" style={{ fontSize: "13px" }}
                   onClick={() => router.push("/dashboard/time-estimate")}>
                    Add Estimates
                  </button>
                  
                </div>
              </div>
            </div>

            {/* Tasks Outstanding (dynamic) */}
            <div className="col-lg-3 col-md-4 col-sm-6">
              <div className="card h-100 task-outstanding rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.75 15.75C1.26875 15.75 0.856771 15.5786 0.514063 15.2359C0.171354 14.8932 0 14.4812 0 14V1.75C0 1.26875 0.171354 0.856771 0.514063 0.514063C0.856771 0.171354 1.26875 0 1.75 0H14C14.1167 0 14.226 0.0109375 14.3281 0.0328125C14.4302 0.0546875 14.5323 0.0875 14.6344 0.13125L13.0156 1.75H1.75V14H14V8.18125L15.75 6.43125V14C15.75 14.4812 15.5786 14.8932 15.2359 15.2359C14.8932 15.5786 14.4812 15.75 14 15.75H1.75ZM7.45938 12.25L2.51562 7.30625L3.74063 6.08125L7.45938 9.8L15.4875 1.77188L16.7344 2.975L7.45938 12.25Z" fill="#D5623A"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      Tasks Outstanding
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">{outstandingCount}</h2>
                  <p className=" mb-3" style={{ fontSize: "14px" }}>
                    In progress or pending with due date
                  </p>
                  <button className="btn btn-outline-danger btn-sm w-100" style={{ fontSize: "13px", borderRadius: "6px" }} onClick={() => router.push("dashboard/MyTask")}>
                    Manage Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row (charts/cards) — unchanged visuals */}
          <div className="row mb-4 g-4">
            {/* Completed This Week */}
            <div className="col-lg-4 col-md-4 col-sm-6">
              <div className="card h-100 completed-this-week rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.7 13.4737V1.68421V11.2421V9.45263V13.4737ZM1.7 15.1579C1.2325 15.1579 0.832292 14.993 0.499375 14.6632C0.166458 14.3333 0 13.9368 0 13.4737V1.68421C0 1.22105 0.166458 0.824561 0.499375 0.494737C0.832292 0.164912 1.2325 0 1.7 0H13.6C14.0675 0 14.4677 0.164912 14.8006 0.494737C15.1335 0.824561 15.3 1.22105 15.3 1.68421V8.42105H13.6V1.68421H1.7V13.4737H7.65V15.1579H1.7ZM12.1975 16L9.18 13.0105L10.3913 11.8316L12.1975 13.6211L15.81 10.0421L17 11.2421L12.1975 16ZM4.25 8.42105C4.49083 8.42105 4.69271 8.34035 4.85563 8.17895C5.01854 8.01754 5.1 7.81754 5.1 7.57895C5.1 7.34035 5.01854 7.14035 4.85563 6.97895C4.69271 6.81754 4.49083 6.73684 4.25 6.73684C4.00917 6.73684 3.80729 6.81754 3.64438 6.97895C3.48146 7.14035 3.4 7.34035 3.4 7.57895C3.4 7.81754 3.48146 8.01754 3.64438 8.17895C3.80729 8.34035 4.00917 8.42105 4.25 8.42105ZM4.25 5.05263C4.49083 5.05263 4.69271 4.97193 4.85563 4.81053C5.01854 4.64912 5.1 4.44912 5.1 4.21053C5.1 3.97193 5.01854 3.77193 4.85563 3.61053C4.69271 3.44912 4.49083 3.36842 4.25 3.36842C4.00917 3.36842 3.80729 3.44912 3.64438 3.61053C3.48146 3.77193 3.4 3.97193 3.4 4.21053C3.4 4.44912 3.48146 4.64912 3.64438 4.81053C3.80729 4.97193 4.00917 5.05263 4.25 5.05263Z" fill="#00A63D"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      Completed This Week
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">25</h2>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div className="progress-bar" role="progressbar" style={{ width: "85%" }} aria-valuenow={85} aria-valuemin={0} aria-valuemax={100}></div>
                  </div>
                  <p className="text-secondary mt-2" style={{ fontSize: "13px" }}>
                    85% of weekly goal
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-4 col-sm-6">
              <div className="card h-100 workspace-point rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                     <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.01979 8.2875L4.63958 6.26875L3.01042 4.95833H5.02917L5.66667 2.975L6.30417 4.95833H8.32292L6.67604 6.26875L7.29583 8.2875L5.66667 7.03021L4.01979 8.2875ZM1.41667 14.875V9.40312C0.968055 8.90729 0.619792 8.34062 0.371875 7.70312C0.123958 7.06562 0 6.38681 0 5.66667C0 4.08472 0.548958 2.74479 1.64688 1.64688C2.74479 0.548958 4.08472 0 5.66667 0C7.24861 0 8.58854 0.548958 9.68646 1.64688C10.7844 2.74479 11.3333 4.08472 11.3333 5.66667C11.3333 6.38681 11.2094 7.06562 10.9615 7.70312C10.7135 8.34062 10.3653 8.90729 9.91667 9.40312V14.875L5.66667 13.4583L1.41667 14.875ZM5.66667 9.91667C6.84722 9.91667 7.85069 9.50347 8.67708 8.67708C9.50347 7.85069 9.91667 6.84722 9.91667 5.66667C9.91667 4.48611 9.50347 3.48264 8.67708 2.65625C7.85069 1.82986 6.84722 1.41667 5.66667 1.41667C4.48611 1.41667 3.48264 1.82986 2.65625 2.65625C1.82986 3.48264 1.41667 4.48611 1.41667 5.66667C1.41667 6.84722 1.82986 7.85069 2.65625 8.67708C3.48264 9.50347 4.48611 9.91667 5.66667 9.91667C5.14725 9.91667 4.64844 9.848 4.17031 9.71217C3.69218 9.57634 3.24653 9.39042 2.83333 9.15426V11.35L5.66667 12.076L8.5 11.35V9.15426C8.08681 9.39042 7.64115 9.57634 7.16302 9.71217C6.6849 9.848 6.18611 9.91667 5.66667 9.91667Z" fill="#8B14DC"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      Workspace Points
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">2,847</h2>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div className="progress-bar" role="progressbar" style={{ width: "85%" }} aria-valuenow={85} aria-valuemin={0} aria-valuemax={100}></div>
                  </div>
                  <p className="text-secondary mt-2" style={{ fontSize: "13px" }}>
                    +12 % this week
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-4 col-sm-6">
              <div className="card h-100 thr rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                     <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.25 12.5C5.38542 12.5 4.57292 12.3359 3.8125 12.0078C3.05208 11.6797 2.39062 11.2344 1.82812 10.6719C1.26562 10.1094 0.820313 9.44792 0.492188 8.6875C0.164062 7.92708 0 7.11458 0 6.25C0 5.38542 0.164062 4.57292 0.492188 3.8125C0.820313 3.05208 1.26562 2.39062 1.82812 1.82812C2.39062 1.26562 3.05208 0.820313 3.8125 0.492188C4.57292 0.164062 5.38542 0 6.25 0C7.11458 0 7.92708 0.164062 8.6875 0.492188C9.44792 0.820313 10.1094 1.26562 10.6719 1.82812C11.2344 2.39062 11.6797 3.05208 12.0078 3.8125C12.3359 4.57292 12.5 5.38542 12.5 6.25C12.5 6.53125 12.4844 6.80729 12.4531 7.07812C12.4219 7.34896 12.3698 7.61458 12.2969 7.875C12.151 7.70833 11.9818 7.56771 11.7891 7.45312C11.5964 7.33854 11.3854 7.26042 11.1562 7.21875C11.1875 7.0625 11.2109 6.90365 11.2266 6.74219C11.2422 6.58073 11.25 6.41667 11.25 6.25C11.25 4.85417 10.7656 3.67188 9.79688 2.70313C8.82812 1.73438 7.64583 1.25 6.25 1.25C4.85417 1.25 3.67188 1.73438 2.70313 2.70313C1.73438 3.67188 1.25 4.85417 1.25 6.25C1.25 7.64583 1.73438 8.82812 2.70313 9.79688C3.67188 10.7656 4.85417 11.25 6.25 11.25C6.78125 11.25 7.28906 11.1719 7.77344 11.0156C8.25781 10.8594 8.70312 10.6406 9.10938 10.3594C9.23438 10.5365 9.38802 10.6927 9.57031 10.8281C9.7526 10.9635 9.94792 11.0677 10.1562 11.1406C9.625 11.5677 9.02865 11.901 8.36719 12.1406C7.70573 12.3802 7 12.5 6.25 12.5ZM10.7812 10C10.5625 10 10.3776 9.92448 10.2266 9.77344C10.0755 9.6224 10 9.4375 10 9.21875C10 9 10.0755 8.8151 10.2266 8.66406C10.3776 8.51302 10.5625 8.4375 10.7812 8.4375C11 8.4375 11.1849 8.51302 11.3359 8.66406C11.487 8.8151 11.5625 9 11.5625 9.21875C11.5625 9.4375 11.487 9.6224 11.3359 9.77344C11.1849 9.92448 11 10 10.7812 10ZM8.3125 9.1875L5.625 6.5V3.125H6.875V6L9.1875 8.3125L8.3125 9.1875Z" fill="#3763E8"/>
</svg>

                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      Total Hours
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">164h</h2>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div className="progress-bar" role="progressbar" style={{ width: "85%" }} aria-valuenow={85} aria-valuemin={0} aria-valuemax={100}></div>
                  </div>
                  <p className="text-secondary mt-2" style={{ fontSize: "13px" }}>
                    10% This month
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row - Charts */} 
          {/* ... rest of unchanged content remains as it was ... */ }
          <div className="row g-4 mb-4">
            {/* Time Reporting Chart */}
            <div className="col-lg-6">
              <div className="card g-border h-100 rounded-13" style={{ borderRadius: "8px" }}>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-4">
                    <h6 className="card-title mb-0" style={{ fontSize: "14px" }}>
                      Time Reporting
                    </h6>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} domain={[0, 12]} />
                      <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }} cursor={{ fill: "rgba(59, 130, 246, 0.1)" }} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Workload by Status Chart */}
            <div className="col-lg-6">
              <div className="card g-border h-100 rounded-13" style={{ borderRadius: "8px" }}>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-4">
                    <h6 className="card-title mb-0" style={{ fontSize: "14px" }}>
                      & Workload by Status
                    </h6>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-3 text-center">
                    <small className="text-success">Completed: 45%</small> • <small style={{ color: "#3b82f6" }}>In Progress: 30%</small> • <small className="text-danger">Overdue: 10%</small> • <small className="text-warning">Pending: 15%</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-12">
              <div className="card g-borde rounded-13">
                <div className="card-body">
                  <h5 className="card-title mb-4">Status over time</h5>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={statusData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis domain={[0, 100]} stroke="#666" />
                      <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "4px" }} />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" name="In-Progress" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="pending" stroke="#eab308" name="Pending" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
