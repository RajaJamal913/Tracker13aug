"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { Table, Button, InputGroup, FormControl, Spinner } from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");

type Project = { id: number; name: string };

type Member = {
  id?: number;
  full_name?: string;
  name?: string;
  email?: string;
  team?: string | null;
  project?: string | null;
  archived?: boolean;
};

type InviteAPI = {
  id?: number;
  email?: string;
  is_accepted?: boolean;
  accepted_at?: string | null;
  logged_in?: boolean;
  tracked_time?: boolean;
  tracked_seconds?: number;
  created_at?: string;
  role?: string;
  project?: number | null;
  project_name?: string | null;
};

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState("members");
  const [activeTab2, setActiveTab2] = useState("email");
  const [showModal, setShowModal] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteProjectId, setInviteProjectId] = useState<number | "new" | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<InviteAPI[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [showOnlyInvited, setShowOnlyInvited] = useState(true);

  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [pendingInviteBanner, setPendingInviteBanner] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Improved readToken: check common keys used by classic DRF TokenAuth and JWT (Simple JWT)
  const readToken = () => {
    if (typeof window === "undefined") return null;
    const keys = ["token", "access", "authToken", "jwt", "accessToken"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return null;
  };

  const makeAuthHeaderFromToken = (rawToken?: string | null) => {
    if (!rawToken) return {};
    const token = rawToken.trim();
    if (/^(Bearer|Token)\s+/i.test(token)) {
      return { Authorization: token };
    }
    // heuristic: JWT has three dot-separated parts
    if (token.split(".").length === 3) {
      return { Authorization: `Bearer ${token}` };
    }
    return { Authorization: `Token ${token}` };
  };

  const makeHeadersWithToken = (): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = readToken();
    const authHeader = makeAuthHeaderFromToken(token);
    return { ...headers, ...(authHeader as Record<string, string>) };
  };

  // -----------------------
  // Normalize helpers (unchanged)
  // -----------------------
  const normalizeMember = (raw: any): Member => {
    const member: Member = {} as Member;
    if (!raw) return member;
    member.id = raw.id ?? raw.pk ?? undefined;
    member.full_name = raw.full_name ?? (raw.user && raw.user.full_name) ?? raw.name ?? raw.username ?? undefined;
    member.name = raw.name ?? member.full_name;
    member.email = raw.email ?? (raw.user && raw.user.email) ?? raw.contact_email ?? undefined;
    member.team = raw.team ?? raw.team_name ?? (raw.team && raw.team.name) ?? undefined;
    if (raw.project && typeof raw.project === "object") {
      member.project = raw.project.name ?? String(raw.project.id ?? "");
    } else {
      member.project = raw.project_name ?? raw.project ?? raw.project_display ?? undefined;
    }
    member.archived = !!raw.archived;
    return member;
  };

  const normalizeInvite = (raw: any): InviteAPI => {
    const invite: InviteAPI = {} as InviteAPI;
    if (!raw) return invite;
    invite.id = raw.id ?? raw.pk ?? undefined;
    invite.email = raw.email ?? raw.invitee_email ?? undefined;
    invite.is_accepted = raw.is_accepted ?? raw.accepted ?? undefined;
    invite.accepted_at = raw.accepted_at ?? raw.accepted_on ?? null;
    invite.logged_in = raw.logged_in ?? raw.has_logged_in ?? undefined;
    invite.tracked_time = raw.tracked_time ?? undefined;
    invite.tracked_seconds = raw.tracked_seconds ?? undefined;
    invite.created_at = raw.created_at ?? raw.created_on ?? undefined;
    invite.role = raw.role ?? undefined;
    invite.project = raw.project ?? raw.project_id ?? undefined;
    invite.project_name = raw.project_name ?? (raw.project && raw.project.name) ?? undefined;
    return invite;
  };

  const getProjectNameFrom = (proj: any, projName?: string | null) => {
    if (projName) return projName;
    if (proj == null || proj === "") return "-";
    const num = typeof proj === "number" ? proj : Number(proj);
    if (!Number.isNaN(num)) {
      const found = projects.find((p) => p.id === num);
      return found ? found.name : String(proj);
    }
    if (typeof proj === "object") return proj.name ?? String(proj.id ?? "-");
    return String(proj);
  };

  // -----------------------
  // Fetch projects / members / invites / archived
  // -----------------------
  useEffect(() => {
    const token = readToken();
    if (!token) {
      setProjects([{ id: 1, name: "Getting Started with WewWizTracker" }]);
      setInviteProjectId((prev) => prev ?? 1);
    }
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const headers = makeHeadersWithToken();
      const res = await fetch(`${API_BASE}/projects/`, {
        method: "GET",
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data.map((p) => ({ id: p.id, name: p.name || p.title || String(p.id) })) : [];
      if (list.length) {
        setProjects(list);
        setInviteProjectId((prev) => (prev === null ? list[0].id : prev));
      } else {
        setProjects([]);
        setInviteProjectId("new");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects((prev) => (prev.length ? prev : []));
      setInviteProjectId((prev) => (prev === null ? "new" : prev));
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`${API_BASE}/members/`, {
        method: "GET",
        headers: makeHeadersWithToken(),
      });
      if (!res.ok) {
        console.warn("GET /members/ failed", res.status);
        setMembers([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data.map(normalizeMember) : [];
      setMembers(list);
    } catch (err) {
      console.error("fetchMembers error:", err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch(`${API_BASE}/invites/`, {
        method: "GET",
        headers: makeHeadersWithToken(),
      });

      if (res.status === 405) {
        console.info("GET /invites/ not supported (405) — leaving existing invites as-is.");
        return;
      }

      if (!res.ok) {
        console.warn("GET /invites/ failed", res.status);
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data.map(normalizeInvite) : [];
      setInvites(list);
    } catch (err) {
      console.error("fetchInvites error:", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const fetchArchivedMembers = async () => {
    setLoadingArchived(true);
    try {
      const res = await fetch(`${API_BASE}/members/?archived=true`, {
        method: "GET",
        headers: makeHeadersWithToken(),
      });
      if (!res.ok) {
        console.warn("GET /members/?archived=true failed", res.status);
        setArchivedMembers([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data.map(normalizeMember) : [];
      setArchivedMembers(list);
    } catch (err) {
      console.error("fetchArchivedMembers error:", err);
      setArchivedMembers([]);
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchInvites();
    fetchArchivedMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------
  // Invite POST + optimistic handling
  // -----------------------
  const postInvite = async (email: string, projectId: number | "new", role: string, projectName?: string) => {
    const headers = makeHeadersWithToken();
    if (!headers || !(headers as Record<string, string>).Authorization) throw new Error("No token found. User might not be authenticated.");

    const body: any =
      projectId === "new"
        ? { email, role, project: null, project_name: projectName ?? null, create_project: true }
        : { email, role, project: projectId };

    const res = await fetch(`${API_BASE}/invites/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return res;
  };

  const handleInvite = async () => {
    setInviteMessage(null);

    if (!inviteEmail || !isValidEmail(inviteEmail)) {
      setInviteMessage("Please enter a valid email address.");
      return;
    }

    if (inviteProjectId === "new") {
      if (!newProjectName || newProjectName.trim().length < 2) {
        setInviteMessage("Please enter a name for the new project (at least 2 characters).");
        return;
      }
    } else if (!inviteProjectId) {
      setInviteMessage("Please select a project.");
      return;
    }

    const token = readToken();
    if (!token) {
      setInviteMessage("Not authenticated. Please log in and ensure a token is stored under localStorage key 'token' or 'access'.");
      return;
    }

    setIsInviting(true);

    const optimisticInvite: InviteAPI = {
      id: Date.now() * -1,
      email: inviteEmail,
      is_accepted: false,
      accepted_at: null,
      logged_in: false,
      tracked_time: false,
      tracked_seconds: 0,
      created_at: new Date().toISOString(),
      role: inviteRole,
      project: inviteProjectId === "new" ? null : (inviteProjectId as number),
      project_name: inviteProjectId === "new" ? newProjectName : projects.find((p) => p.id === inviteProjectId)?.name ?? undefined,
    };

    try {
      setInvites((prev) => {
        const without = prev.filter((iv) => (iv.email ?? "").toLowerCase() !== inviteEmail.toLowerCase());
        return [optimisticInvite, ...without];
      });

      setMembers((prev) => {
        const already = prev.some((m) => (m.email ?? "").toLowerCase() === inviteEmail.toLowerCase());
        if (already) return prev;
        const invitedMember: Member = {
          id: optimisticInvite.id as number,
          full_name: `Invited: ${inviteEmail}`,
          name: `Invited: ${inviteEmail}`,
          email: inviteEmail,
          team: "-",
          project: optimisticInvite.project_name ?? "-",
          archived: false,
        };
        return [invitedMember, ...prev];
      });

      const res = await postInvite(inviteEmail, inviteProjectId!, inviteRole, newProjectName);

      if (res.ok) {
        let body: any = null;
        try {
          const ct = res.headers.get?.("content-type") ?? "";
          if (ct.includes("application/json")) body = await res.json();
          else body = null;
        } catch {
          body = null;
        }

        const serverInvite = body ? normalizeInvite(body) : optimisticInvite;

        setInvites((prev) => {
          const filtered = prev.filter((iv) => (iv.email ?? "").toLowerCase() !== (serverInvite.email ?? "").toLowerCase());
          return [serverInvite, ...filtered];
        });

        setMembers((prev) => {
          return prev.map((m) =>
            (m.email ?? "").toLowerCase() === (serverInvite.email ?? "").toLowerCase()
              ? { ...(m as Member), id: serverInvite.id ?? m.id, project: serverInvite.project_name ?? m.project }
              : m
          );
        });

        setInviteMessage("Invite sent successfully.");
        setInviteEmail("");
        setNewProjectName("");

        await fetchProjects();
        await fetchMembers();
      } else {
        setInvites((prev) => prev.filter((iv) => (iv.email ?? "").toLowerCase() !== inviteEmail.toLowerCase()));
        setMembers((prev) => prev.filter((m) => (m.email ?? "").toLowerCase() !== inviteEmail.toLowerCase()));

        let detail = `Invite failed (status ${res.status}).`;
        try {
          const ct = res.headers.get?.("content-type") ?? "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            detail = j?.detail || j?.message || JSON.stringify(j) || detail;
          } else {
            detail = (await res.text()) || detail;
          }
        } catch {}
        setInviteMessage(detail);
      }
    } catch (err: any) {
      console.error("Invite threw", err);
      setInvites((prev) => prev.filter((iv) => (iv.email ?? "").toLowerCase() !== inviteEmail.toLowerCase()));
      setMembers((prev) => prev.filter((m) => (m.email ?? "").toLowerCase() !== inviteEmail.toLowerCase()));
      setInviteMessage(err?.message || "Network error while sending invite.");
    } finally {
      setIsInviting(false);
    }
  };

  // -----------------------
  // Accept invite token handling (updated to use header helper)
  // -----------------------
  const acceptInviteToken = async (tokenToAccept: string) => {
    if (!tokenToAccept) return { ok: false, message: "no token" };
    const headers = makeHeadersWithToken();
    if (!headers || !(headers as Record<string, string>).Authorization) return { ok: false, message: "not authenticated" };

    try {
      const res = await fetch(`${API_BASE}/invites/accept/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token: tokenToAccept }),
      });

      if (res.ok) {
        await Promise.all([fetchMembers(), fetchInvites()]);
        localStorage.removeItem("pending_invite_token");
        setPendingInviteToken(null);
        setPendingInviteBanner(null);
        return { ok: true };
      } else {
        const body = await res.json().catch(() => null);
        const message = body?.detail || body?.message || `Accept failed (${res.status})`;
        return { ok: false, message };
      }
    } catch (err: any) {
      console.error("acceptInviteToken error:", err);
      return { ok: false, message: err?.message || "network error" };
    }
  };

  const readInviteTokenFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const candidates = ["token", "invite", "invite_token"];
    for (const k of candidates) {
      const v = params.get(k);
      if (v) return v;
    }
    return null;
  };

  useEffect(() => {
    const t = readInviteTokenFromUrl();
    if (t) {
      const auth = readToken();
      if (auth) {
        (async () => {
          const { ok, message } = await acceptInviteToken(t);
          if (!ok) setInviteMessage(`Failed to accept invite token: ${message}`);
        })();
      } else {
        localStorage.setItem("pending_invite_token", t);
        setPendingInviteToken(t);
        setPendingInviteBanner("You have an invite — sign in or complete registration to accept it automatically.");
      }
    } else {
      const pending = localStorage.getItem("pending_invite_token");
      if (pending) {
        setPendingInviteToken(pending);
        const auth = readToken();
        if (auth) {
          (async () => {
            const { ok, message } = await acceptInviteToken(pending);
            if (!ok) setInviteMessage(`Failed to accept pending invite: ${message}`);
          })();
        } else {
          setPendingInviteBanner("You have a pending invite — please sign in to accept it.");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (ev: StorageEvent) => {
      if (ev.key === "token" && ev.newValue) {
        const pending = localStorage.getItem("pending_invite_token");
        if (pending) {
          (async () => {
            const { ok, message } = await acceptInviteToken(pending);
            if (!ok) {
              setInviteMessage(`Failed to accept pending invite after login: ${message}`);
            } else {
              setInviteMessage("Invite accepted after login.");
            }
          })();
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem("pending_invite_token");
    if (!pending) return;
    const check = async () => {
      const auth = readToken();
      if (auth) {
        const { ok, message } = await acceptInviteToken(pending);
        if (!ok) setInviteMessage(`Failed to accept pending invite: ${message}`);
      }
    };
    const id = setTimeout(check, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inviteAccepted = (i: InviteAPI) => !!(i.is_accepted || i.accepted_at);
  const inviteLoggedIn = (i: InviteAPI) => !!(i.logged_in);
  const inviteTrackedTime = (i: InviteAPI) => !!(i.tracked_time || (i.tracked_seconds && i.tracked_seconds > 0));

  const workspaceInviteLink = typeof window !== "undefined" ? `${window.location.origin}/app/join-invite/abc123` : "";

  const sampleMembers: Member[] = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    name: `Member ${i + 1}`,
    email: "-",
    team: "-",
    project: "-",
  }));

  const invitedMembersDisplay: Member[] = React.useMemo(() => {
    const inviteEmails = new Set<string>();
    invites.forEach((iv) => { if (iv.email) inviteEmails.add(iv.email.toLowerCase()); });

    const matchedMembers: Member[] = members
      .map((m) => ({ ...m, project: getProjectNameFrom(m.project) }))
      .filter((m) => { const em = (m.email ?? "").toLowerCase(); return em && inviteEmails.has(em); });

    const matchedMemberEmails = new Set(matchedMembers.map((m) => (m.email ?? "").toLowerCase()));

    const inviteOnlyRows: Member[] = invites
      .filter((iv) => (iv.email ?? "").trim() !== "")
      .filter((iv) => !matchedMemberEmails.has((iv.email ?? "").toLowerCase()))
      .map((iv) => ({
        id: iv.id ?? undefined,
        full_name: `Invited: ${iv.email}`,
        name: `Invited: ${iv.email}`,
        email: iv.email,
        team: "-",
        project: getProjectNameFrom(iv.project, iv.project_name),
        archived: false,
      } as Member));

    return [...matchedMembers, ...inviteOnlyRows];
  }, [members, invites, projects]);

  return (
    <div className="container-fluid">
      {pendingInviteBanner && (
        <div className="alert alert-info mt-2">
          {pendingInviteBanner} <strong>After you sign in, the invite will be accepted automatically.</strong>
        </div>
      )}

      <div className="row mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
          <h2 className="page-heading-wrapper">Members</h2>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <button className="btn g-btn" style={{ backgroundColor: "#A463F2" }} onClick={() => setShowModal(true)}>
              + Invite
            </button>
          </div>
        </div>
      </div>

      <div className="row mt-3">
        <div className="tabContainer profile-settings-tabs-wrapper mb-4 multi-style">
          <div className="um-btns-wrap d-flex align-items-center">
            <button
              className={`btn border-0 fw-bold tabButton ${activeTab === "members" ? "text-primary position-relative active" : ""}`}
              onClick={() => setActiveTab("members")}
            >
              Members
            </button>

            <button
              className={`btn border-0 fw-bold tabButton mx-3 ${activeTab === "onboarding" ? "text-primary position-relative active" : ""}`}
              onClick={() => setActiveTab("onboarding")}
            >
              Onboarding Status
            </button>

            <button
              className={`btn border-0 fw-bold tabButton ${activeTab === "archived" ? "text-primary position-relative active" : ""}`}
              onClick={() => setActiveTab("archived")}
            >
              Archived
            </button>

            <div style={{ marginLeft: "1rem", display: "none" }}>
              <small className="text-muted me-2">View:</small>
              <Button
                size="sm"
                variant={showOnlyInvited ? "primary" : "outline-primary"}
                onClick={() => setShowOnlyInvited(true)}
                className="me-1"
              >
                Invited only
              </Button>
              <Button
                size="sm"
                variant={!showOnlyInvited ? "primary" : "outline-primary"}
                onClick={() => setShowOnlyInvited(false)}
              >
                All members
              </Button>
            </div>
          </div>
        </div>

        <div className="col-lg-12 px-0">
          {activeTab === "members" && (
            <div>
              <div className="table-responsive g-table-wrap g-t-scroll">
                <Table hover className="text-center g-table">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                      <th>Members</th>
                      <th>Email</th>
                      <th>Team</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembers ? (
                      sampleMembers.map((data, idx) => (
                        <tr key={data.id ?? idx} className="text-center">
                          <td className="border border-gray-300 px-4 py-2">{data.full_name ?? data.name ?? `Member ${idx + 1}`}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.email ?? "-"}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.team ?? "-"}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.project ?? "-"}</td>
                        </tr>
                      ))
                    ) : invitedMembersDisplay.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No invited members found.</td>
                      </tr>
                    ) : (
                      invitedMembersDisplay.map((data, idx) => (
                        <tr key={data.id ?? idx} className="text-center">
                          <td className="border border-gray-300 px-4 py-2">{data.full_name ?? data.name ?? `Member ${idx + 1}`}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.email ?? "-"}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.team ?? "-"}</td>
                          <td className="border border-gray-300 px-4 py-2">{data.project ?? "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === "onboarding" && (
            <div>
              <div className="container-fluid mt-4">
                <div className="table-responsive g-table-wrap g-t-scroll">
                  <Table className="text-center g-table table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Accepted Invitation</th>
                        <th>Project</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingInvites && (
                        <tr>
                          <td colSpan={4}>Loading invites...</td>
                        </tr>
                      )}

                      {!loadingInvites && invites.length === 0 && (
                        <tr>
                          <td colSpan={4}>No invites found.</td>
                        </tr>
                      )}

                      {invites.map((user, i) => (
                        <tr key={user.id ?? user.email ?? i}>
                          <td>{user.email ?? "-"}</td>
                          <td className="text-center">{inviteAccepted(user) ? <FaCheckCircle color="green" /> : <FaTimesCircle color="red" />}</td>
                          <td>{getProjectNameFrom(user.project, user.project_name)}</td>
                          <td>{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "archived" && (
            <div>
              <div className="table-responsive g-table-wrap g-t-scroll">
                <Table className="text-center g-table">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                      <th>Members</th>
                      <th>Email</th>
                      <th>Team</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingArchived && (
                      <tr>
                        <td colSpan={4}>Loading archived members...</td>
                      </tr>
                    )}
                    {!loadingArchived && archivedMembers.length === 0 && (
                      <tr>
                        <td colSpan={4}>No archived members.</td>
                      </tr>
                    )}
                    {archivedMembers.map((data, idx) => (
                      <tr key={data.id ?? idx} className="text-center">
                        <td className="border border-gray-300 px-4 py-2">{data.full_name ?? data.name ?? `Member ${idx + 1}`}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.email ?? "-"}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.team ?? "-"}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.project ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mt-3">
        {showModal && (
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-md">
              <div className="modal-content p-4 g-modal-conntent-wrapper rounded-4 g-shadow">
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <h5 className="fw-bold">Invite Members</h5>
                  <button className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>

                <div className="tabContainer profile-settings-tabs-wrapper mb-4">
                  <div className="um-btns-wrap d-flex">
                    <button className={`btn border-0 fw-bold tabButton ${activeTab2 === "email" ? "active position-relative " : ""}`} onClick={() => setActiveTab2("email")}>
                      By Email
                    </button>

                    <button className={`btn border-0 fw-bold tabButton ${activeTab2 === "link" ? "active position-relative" : ""}`} onClick={() => setActiveTab2("link")}>
                      Copy Link
                    </button>
                  </div>
                </div>

                {activeTab2 === "email" && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-12 mb-3">
                        <label className="fw-bold">Email</label>
                        <input type="email" className="form-control" placeholder="example@gmail.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="fw-bold">Role</label>
                        <select className="form-control" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                          <option>Member</option>
                          <option>Manager</option>
                          <option>Viewer</option>
                        </select>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="fw-bold">Project</label>
                        <select
                          className="form-control"
                          value={inviteProjectId === null ? "" : String(inviteProjectId)}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "new") {
                              setInviteProjectId("new");
                            } else if (v === "") {
                              setInviteProjectId(null);
                            } else {
                              setInviteProjectId(Number(v));
                            }
                          }}
                        >
                          <option value="new">+ Create new project…</option>

                          {loadingProjects ? (
                            <option value="">Loading...</option>
                          ) : projects.length === 0 ? (
                            <option value="" disabled>
                              No existing projects
                            </option>
                          ) : (
                            projects.map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {inviteProjectId === "new" && (
                        <div className="col-md-12 mb-3">
                          <label className="fw-bold">New Project Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter new project name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                          />
                          <small className="text-muted">A new project will be created and the invite attached to it.</small>
                        </div>
                      )}
                    </div>

                    {inviteMessage && <div className="alert alert-info">{inviteMessage}</div>}

                    <div className="d-flex justify-content-end mt-3">
                      <button className="btn g-btn-secondary me-2" onClick={() => setShowModal(false)}>Cancel</button>
                      <button className="btn g-btn" style={{ backgroundColor: "#A463F2" }} onClick={handleInvite} disabled={isInviting}>
                        {isInviting ? (
                          <>
                            <Spinner animation="border" size="sm" role="status" aria-hidden />
                            <span className="ms-2">Sending...</span>
                          </>
                        ) : (
                          "Invite"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab2 === "link" && (
                  <div className="text-center p-3 border rounded">
                    <div className="mt-3">
                      <p>Copy the link to this workspace and send to members:</p>
                      <InputGroup>
                        <FormControl readOnly value={workspaceInviteLink} />
                        <Button onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(workspaceInviteLink);
                            alert("Copied!");
                          } catch {
                            alert("Copy failed — please copy manually.");
                          }
                        }} className="g-btn">Copy</Button>
                      </InputGroup>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showModal && <div className="modal-backdrop fade show"></div>}
      </div>

      <style jsx>{`
        .card_wrapper_bg_grad {
          background: linear-gradient(90deg, #b07af345 0%, #d0f8fe66 46.15%, #b07af347 69.23%, #d0f8fe66 100%);
          box-shadow: 0 1px 9px #8c8c8cc9;
          border-radius: 15px;
        }
        .stat-card {
          border: none;
          border-radius: 1.5rem;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          transition: transform .3s;
          display: flex;
          padding: 40px 20px !important;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 .5rem 1rem #00000026;
        }
        .stat-card .icon-circle {
          color: #8e44ad;
          background-color: #b980ff;
          border-radius: 50%;
          justify-content: center;
          align-items: center;
          width: 60px;
          height: 60px;
          padding: 10px;
          display: flex;
        }
      `}</style>
    </div>
  );
}
