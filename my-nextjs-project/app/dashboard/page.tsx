"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Image from "next/image";
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

/* --------------------------- Main page component --------------------------- */
export default function Home() {
  const [username, setUsername] = useState<string>("Loading…");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
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

      <main className=" min-vh-100 p-4">
        <div className="container-fluid">
          {/* Info Cards */}
          <div className="mb-5 row sprints-wrapper">
            <div className="col-lg-12">
              <div className="d-flex align-items-center gap-3 mb-4">
                <FileText className="text-primary" size={24} />
                <h1 className="h4 mb-0" style={{ color: "#0066cc" }}>
                  Time Estimation Accuracy
                </h1>
              </div>
            </div>

            {/* Code Reviews Card */}
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

            {/* Daily Standups Card */}
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

            {/* Sprint Duration Card */}
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
          <div className="row mb-4 ">
            {/* Tasks by Assignee */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card h-100 task-by-assignee rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="me-2" style={{ width: "20px", height: "20px" }}>
                      {/* svg */}
                    </div>
                    <h6 className="card-title mb-0 text-secondary" style={{ fontSize: "14px" }}>
                      Tasks by Assignee
                    </h6>
                  </div>

                  <div className="mt-4">
                    <div className="mb-3">
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle me-2 assignee-round">SC</div>
                        <span className="flex-grow-1" style={{ fontSize: "14px" }}>
                          Sarah Chan
                        </span>
                        <span className="num text-secondary" style={{ fontSize: "12px" }}>
                          8/12
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex align-items-center">
                        <div className=" rounded-circle me-2 assignee-round">MJ</div>
                        <span className="flex-grow-1" style={{ fontSize: "14px" }}>
                          Mike Johnson
                        </span>
                        <span className="num text-secondary" style={{ fontSize: "12px" }}>
                          11/15
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex align-items-center">
                        <div className=" rounded-circle me-2 assignee-round">ED</div>
                        <span className="flex-grow-1" style={{ fontSize: "14px" }}>
                          Emily Davis
                        </span>
                        <span className="num text-secondary" style={{ fontSize: "12px" }}>
                          7/9
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-top">
                      <a href="#" className="text-decoration-none text-secondary" style={{ fontSize: "13px" }}>
                        View all assignees →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overdue Tasks */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card h-100 overdue-task rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
                    </div>
                    <h6 className="card-title mb-0 ms-2">Overdue Tasks</h6>
                  </div>

                  <h2 className="fw-bold mb-2">8</h2>
                  <p className="mb-3" style={{ fontSize: "14px" }}>
                    Require immediate attention
                  </p>
                  <button className="btn btn-sm w-100">View Details</button>
                </div>
              </div>
            </div>

            {/* No Time Estimate */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card h-100 no-time-estimate rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      No Time Estimate
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">14</h2>
                  <p className=" mb-3" style={{ fontSize: "14px" }}>
                    Tasks need estimation
                  </p>
                  <button className="btn btn-outline-warning btn-sm w-100" style={{ fontSize: "13px" }}>
                    Add Estimates
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks Outstanding */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card h-100 task-outstanding rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
                    </div>
                    <h6 className="card-title mb-0 ms-2 " style={{ fontSize: "14px" }}>
                      Tasks Outstanding
                    </h6>
                  </div>

                  <h2 className=" fw-bold mb-2">32</h2>
                  <p className=" mb-3" style={{ fontSize: "14px" }}>
                    In progress or pending
                  </p>
                  <button className="btn btn-outline-danger btn-sm w-100" style={{ fontSize: "13px", borderRadius: "6px" }}>
                    Manage Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row */}
          <div className="row mb-4">
            {/* Completed This Week */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 completed-this-week rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
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

            <div className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 workspace-point rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
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

            <div className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 thr rounded-13">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="" style={{ fontSize: "20px" }}>
                      {/* svg */}
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
          <div className="row">
            {/* Time Reporting Chart */}
            <div className="col-lg-6 mb-4">
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
            <div className="col-lg-6 mb-4">
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

          <div className="row">
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
      </main>
    </>
  );
}
