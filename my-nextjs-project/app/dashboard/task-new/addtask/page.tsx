"use client";

import React, { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TaskCompletionChart from "@/components/charts/task-completion-chart";
import ProductivityChart from "@/components/charts/monthly-productivity-chart";
import { Modal, Form, Spinner } from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

type Project = {
  id?: number | string;
  pk?: number | string;
  name?: string;
  title?: string;
  project_name?: string;
  [k: string]: any;
};

const PROJECT_TYPES = {
  WEB: "Web",
  MOBILE: "Mobile",
  BOTH: "Both",
} as const;

const priorityOptions = ["High", "Medium", "Low"].map((p) => ({ label: p, value: p }));
const projectTypeOptions = [
  { label: "Web", value: PROJECT_TYPES.WEB },
  { label: "Mobile", value: PROJECT_TYPES.MOBILE },
  { label: "Both", value: PROJECT_TYPES.BOTH },
];

const allTags = [
  "Design",
  "UI/UX",
  "Frontend",
  "Backend",
  "DevOps",
  "Security",
  "API",
  "Testing",
  "Review",
  "Planning",
  "Authentication",
  "Management",
];

const PREVIEW_STORAGE_KEY = "task_preview_items";
const PREVIEW_PROJECTS_KEY = "task_preview_projects";

export default function SmartTaskMgt(): JSX.Element {
  const router = useRouter();

  // modal + tasks preview
  const [show, setShow] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // projects state
  const [projectOptions, setProjectOptions] = useState<{ label: string; value: any }[]>([]);
  const [projectsIndex, setProjectsIndex] = useState<Record<string | number, Project>>({});
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<any>(null);

  // form states
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<any>(null);
  const [showFigma, setShowFigma] = useState(false);
  const [webDesc, setWebDesc] = useState("");
  const [mobileDesc, setMobileDesc] = useState("");
  const [figmaDesc, setFigmaDesc] = useState("");
  const [priority, setPriority] = useState<any>(null);
  const [deadline, setDeadline] = useState("");
  // hours is either number or empty string for controlled input
  const [hours, setHours] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);

  // UX / saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // total tasks stat
  const [totalCreatedTasks, setTotalCreatedTasks] = useState<number | null>(null);
  const [totalLoading, setTotalLoading] = useState<boolean>(true);

  // dynamic stat cards
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // helper to display project label
  const projectLabel = (id: any) => {
    if (id == null) return "";
    const p = projectsIndex[id];
    if (!p) return `Project ${id}`;
    return p.name ?? p.title ?? p.project_name ?? `Project ${id}`;
  };

  // fetchWithAuth helper — _defined before_ effects so they can call it
  const fetchWithAuth = async (
    path: string,
    opts: RequestInit = {},
    attemptAuthSchemes: ("Token" | "Bearer")[] = ["Token", "Bearer"]
  ): Promise<Response> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = API_BASE_URL + path;
    if (!token) {
      return fetch(url, { ...opts, credentials: "include" });
    }

    let lastRes: Response | null = null;
    for (const scheme of attemptAuthSchemes) {
      const headers = new Headers(opts.headers ?? {});
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      headers.set("Authorization", `${scheme} ${token}`);

      const res = await fetch(url, { ...opts, headers, credentials: "include" });
      lastRes = res;
      if (res.status !== 401) return res;
    }
    // lastRes is non-null because token was present and loop ran
    return lastRes!;
  };

  // fetch projects on mount
  useEffect(() => {
    let mounted = true;

    const fetchProjects = async () => {
      setLoadingProjects(true);
      setProjectsError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          if (!mounted) return;
          setProjectsError("No token found");
          setProjectOptions([]);
          setProjectsIndex({});
          setLoadingProjects(false);
          return;
        }

        // try Token and then Bearer
        const url = API_BASE_URL + "/api/projects/";
        let res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        });

        if (res.status === 401) {
          res = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("[Projects] fetch failed:", res.status, txt);
          if (!mounted) return;
          setProjectsError(`Failed to load projects: ${res.status}`);
          setProjectOptions([]);
          setProjectsIndex({});
          setLoadingProjects(false);
          return;
        }

        const data = await res.json().catch(() => null);
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.results)) list = data.results;
        else if (data && Array.isArray(data.data)) list = data.data;
        else if (data && typeof data === "object") {
          const maybeArr = Object.values(data).find((v) => Array.isArray(v));
          if (Array.isArray(maybeArr)) list = maybeArr as any[];
          else if (data.id || data.pk) list = [data];
          else list = [];
        }

        const index: Record<string | number, Project> = {};
        const opts = list.map((p: any) => {
          const id = p.id ?? p.pk ?? p.project_id ?? JSON.stringify(p);
          const label = p.name ?? p.title ?? p.project_name ?? `Project ${id}`;
          index[id] = p;
          return { label, value: id };
        });

        if (!mounted) return;
        setProjectsIndex(index);
        setProjectOptions(opts);
        if (opts.length === 0) setProjectsError("No projects returned from the API.");
      } catch (err: any) {
        console.error("[Projects] fetch error:", err);
        if (!mounted) return;
        setProjectsError(String(err?.message ?? err) || "Unknown error");
        setProjectOptions([]);
        setProjectsIndex({});
      } finally {
        if (!mounted) return;
        setLoadingProjects(false);
      }
    };

    fetchProjects();
    return () => {
      mounted = false;
    };
  }, []);

  // fetch total created tasks stat
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      if (!mounted) return;
      setTotalLoading(true);
      try {
        const res = await fetchWithAuth("/api/tasksai/stats/");
        if (!res || !res.ok) {
          if (!mounted) return;
          setTotalCreatedTasks(0);
          setTotalLoading(false);
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        const n = Number(json.total_created ?? json.total ?? 0);
        setTotalCreatedTasks(Number.isNaN(n) ? 0 : n);
      } catch (err) {
        console.error("[Tasks Stats] fetch error", err);
        if (!mounted) return;
        setTotalCreatedTasks(0);
      } finally {
        if (!mounted) return;
        setTotalLoading(false);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  // NEW: fetch created tasks and compute completed / overdue / pending counts
  useEffect(() => {
    let mounted = true;
    const fetchCreatedForStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        // try to fetch many items in one request; backend may paginate but often supports page_size
        const res = await fetchWithAuth("/api/tasksai/created/?page_size=1000");
        if (!res || !res.ok) {
          // try without page_size as fallback
          const res2 = await fetchWithAuth("/api/tasksai/created/");
          if (!res2 || !res2.ok) {
            throw new Error(`Failed (${res?.status ?? res2?.status ?? "unknown"})`);
          }
          const data2 = await res2.json().catch(() => null);
          analyzeAndSetCounts(data2);
          return;
        }
        const data = await res.json().catch(() => null);
        analyzeAndSetCounts(data);
      } catch (err: any) {
        console.error("[Tasks Created] stats fetch error:", err);
        if (!mounted) return;
        setStatsError(String(err?.message ?? err) || "Failed fetching created tasks");
        setCompletedCount(null);
        setOverdueCount(null);
        setPendingCount(null);
      } finally {
        if (!mounted) return;
        setStatsLoading(false);
      }
    };

    const analyzeAndSetCounts = (data: any) => {
      if (!mounted) return;
      let list: any[] = [];
      if (!data) {
        list = [];
      } else if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.results)) {
        list = data.results;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      } else if (data && typeof data === "object") {
        // if it's a single object, wrap; otherwise try to find array inside
        if (data.id || data.pk) list = [data];
        else {
          const maybeArr = Object.values(data).find((v) => Array.isArray(v));
          list = Array.isArray(maybeArr) ? maybeArr : [];
        }
      }

      // compute counts with robust detection
      let completed = 0;
      let overdue = 0;
      let pending = 0;
      const now = Date.now();

      const isCompleted = (t: any) => {
        try {
          // common boolean flags
          if (t.completed === true || t.is_completed === true || t.done === true) return true;
          // completed_at-ish timestamps
          if (t.completed_at || t.finished_at || t.closed_at) return true;
          // status strings
          if (t.status && typeof t.status === "string") {
            const s = t.status.toLowerCase();
            if (s.includes("complete") || s.includes("done") || s.includes("closed") || s.includes("finished") || s.includes("resolved")) return true;
          }
          // workflow/state
          if (t.state && typeof t.state === "string") {
            const s = t.state.toLowerCase();
            if (s.includes("complete") || s.includes("done") || s.includes("closed") || s.includes("finished") || s.includes("resolved")) return true;
          }
          // some APIs use numeric status codes (e.g., 2 = completed); be conservative and only treat 1/true as completed above
        } catch (e) {
          // ignore
        }
        return false;
      };

      for (const t of list) {
        const completedFlag = isCompleted(t);
        let deadlineDate: number | null = null;
        try {
          const dl = t.deadline || t.due_date || t.due || (t.extra && t.extra.deadline) || null;
          if (dl) {
            // Accept both date-only and ISO datetimes
            const parsed = new Date(dl);
            if (!isNaN(parsed.getTime())) deadlineDate = parsed.getTime();
          }
        } catch (e) {
          deadlineDate = null;
        }

        if (completedFlag) {
          completed += 1;
          continue;
        }

        if (deadlineDate !== null && deadlineDate < now) {
          overdue += 1;
        } else {
          pending += 1;
        }
      }

      setCompletedCount(completed);
      setOverdueCount(overdue);
      setPendingCount(pending);
    };

    fetchCreatedForStats();
    return () => {
      mounted = false;
    };
  }, [/* run on mount only */]);

  // create task: POST to backend and append returned item to tasks
  const createTaskOnServer = async (payload: Record<string, any>) => {
    const res = await fetchWithAuth("/api/tasksai/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errText = `${res.status} ${res.statusText}`;
      try {
        const json = await res.json();
        if (json.detail) errText = String(json.detail);
        else errText = JSON.stringify(json);
      } catch {
        try {
          const txt = await res.text();
          if (txt) errText = txt;
        } catch { }
      }
      throw new Error(errText);
    }

    const data = await res.json();
    return data;
  };

  const handleSubmit = async () => {
    setSaveError(null);
    setSaving(true);

    const payload: Record<string, any> = {
      selectedProjectId: selectedProjectId ?? null,
      title: title?.trim() ?? "",
      project_type: projectType ?? null,
      web_desc: webDesc ?? "",
      mobile_desc: mobileDesc ?? "",
      figma_desc: figmaDesc ?? "",
      priority: priority ?? null,
      deadline: deadline || null,
      hours: typeof hours === "number" ? hours : Number(hours) || 0,
      tags: tags ?? [],
      extra: {},
    };

    try {
      const created = await createTaskOnServer(payload);

      const projectId = created.selectedProjectId ?? created.project ?? selectedProjectId ?? null;
      const computedLabel = projectLabel(projectId);

      const serverProjectName =
        (created.project && (created.project.name || created.project.title || created.project.project_name)) ||
        created.project_name ||
        null;

      const finalProjectLabel = serverProjectName ?? computedLabel;

      const createdWithLabel = { ...created, selectedProjectId: projectId, projectLabel: finalProjectLabel };

      const newTasks = [createdWithLabel, ...tasks];
      setTasks(newTasks);

      try {
        localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(newTasks));
      } catch (e) {
        console.warn("Failed to write preview tasks to localStorage", e);
      }

      try {
        const projectLabelsMap: Record<string, string> = {};
        Object.entries(projectsIndex).forEach(([k, v]) => {
          projectLabelsMap[String(k)] = (v && (v.name || v.title || v.project_name)) || `Project ${k}`;
        });
        if (projectId != null && !projectLabelsMap[String(projectId)]) {
          projectLabelsMap[String(projectId)] = finalProjectLabel ?? `Project ${projectId}`;
        }
        localStorage.setItem(PREVIEW_PROJECTS_KEY, JSON.stringify(projectLabelsMap));
      } catch (e) {
        console.warn("Failed to save project labels to localStorage", e);
      }

      setShow(false);
      // navigate to preview page (adjust if you don't have this route)
      router.push("/dashboard/task-new/preview");
    } catch (err: any) {
      console.error("[Tasks] create failed:", err);
      setSaveError(String(err?.message ?? err) || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags((prev) => {
      if (checked) return [...prev, tag];
      return prev.filter((t) => t !== tag);
    });
  };

  // Handle manual task creation - navigate to project selection or first project
  const handleAddTaskManually = () => {
    if (projectOptions.length > 0) {
      // Navigate to the first project's add tasks page, or you could show a project selection
      const firstProject = projectOptions[0];
      router.push(`/dashboard/Task/${firstProject.value}/addtasks`);
    } else {
      // If no projects available, show the modal to create a project first or show an error
      alert("No projects available. Please create a project first.");
      setShow(true);
    }
  };

  return (
    <>
      <div className="container-fluid py-4 px-0">
        <div className="row mb-4">
          <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
            <h2 className="page-heading-wrapper">Smart Task Management</h2>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <button className="btn g-btn" onClick={() => setShow(true)}>
                + Add Task Using AI
              </button>
              <button className="btn g-btn" onClick={handleAddTaskManually}>
                + Add Task Manually
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Card 1: My Created Task */}
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-blue" role="button"
              onClick={() => router.push("/dashboard/task-new/taskcreated")}
              style={{ cursor: "pointer" }}
              title="View tasks you created">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-blue">My Created Task</small>
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM3.55556 14.4H9.77778V12.6H3.55556V14.4ZM3.55556 10.8H12.4444V9H3.55556V10.8ZM3.55556 7.2H12.4444V5.4H3.55556V7.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#2F6CE5" />
                </svg>
              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-blue">
                  {totalLoading ? <Spinner animation="border" size="sm" /> : totalCreatedTasks ?? 0}
                </h5>
              </div>
            </div>
          </div>

          {/* Card 2: Completed Task */}
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-green">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-green">Completed Task</small>
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0H2C0.9 0 0.0100002 0.9 0.0100002 2L0 18C0 19.1 0.89 20 1.99 20H14C15.1 20 16 19.1 16 18V6L10 0ZM6.94 16L3.4 12.46L4.81 11.05L6.93 13.17L11.17 8.93L12.58 10.34L6.94 16ZM9 7V1.5L14.5 7H9Z" fill="#2F6CE5" />
                </svg>
              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-green">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : (completedCount ?? 0)}
                </h5>
              </div>
            </div>
          </div>

          {/* Card 3: Over Due Task */}
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-yellow">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-yellow">Over Due Task</small>
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 14.4C8.25185 14.4 8.46296 14.3138 8.63333 14.1413C8.8037 13.9688 8.88889 13.755 8.88889 13.5C8.88889 13.245 8.8037 13.0312 8.63333 12.8588C8.46296 12.6863 8.25185 12.6 8 12.6C7.74815 12.6 7.53704 12.6863 7.36667 12.8588C7.1963 13.0312 7.11111 13.245 7.11111 13.5C7.11111 13.755 7.1963 13.9688 7.36667 14.1413C7.53704 14.3138 7.74815 14.4 8 14.4ZM7.11111 10.8H8.88889V5.4H7.11111V10.8ZM1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#D08700" />
                </svg>
              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-yellow">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : (overdueCount ?? 0)}
                </h5>
              </div>
            </div>
          </div>

          {/* Card 4: Pending Task */}
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-red">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-red">Pending Task</small>
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.7895 18C10.6246 18 9.63158 17.5821 8.81053 16.7464C7.98947 15.9107 7.57895 14.9 7.57895 13.7143C7.57895 12.5286 7.98947 11.5179 8.81053 10.6821C9.63158 9.84643 10.6246 9.42857 11.7895 9.42857C12.9544 9.42857 13.9474 9.84643 14.7684 10.6821C15.5895 11.5179 16 12.5286 16 13.7143C16 14.9 15.5895 15.9107 14.7684 16.7464C13.9474 17.5821 12.9544 18 11.7895 18ZM13.2 15.75L13.7895 15.15L12.2105 13.5429V11.1429H11.3684V13.8857L13.2 15.75ZM1.68421 17.1429C1.22105 17.1429 0.824561 16.975 0.494737 16.6393C0.164912 16.3036 0 15.9 0 15.4286V3.42857C0 2.95714 0.164912 2.55357 0.494737 2.21786C0.824561 1.88214 1.22105 1.71429 1.68421 1.71429H5.2C5.35439 1.21429 5.65614 0.803571 6.10526 0.482143C6.55439 0.160714 7.04561 0 7.57895 0C8.14035 0 8.64211 0.160714 9.08421 0.482143C9.52632 0.803571 9.82456 1.21429 9.97895 1.71429H13.4737C13.9368 1.71429 14.3333 1.88214 14.6632 2.21786C14.993 2.55357 15.1579 2.95714 15.1579 3.42857V8.78571C14.9053 8.6 14.6386 8.44286 14.3579 8.31429C14.0772 8.18571 13.7825 8.07143 13.4737 7.97143V3.42857H11.7895V6H3.36842V3.42857H1.68421V15.4286H6.14737C6.24561 15.7429 6.3579 16.0429 6.48421 16.3286C6.61053 16.6143 6.76491 16.8857 6.94737 17.1429H1.68421ZM7.57895 3.42857C7.81754 3.42857 8.01754 3.34643 8.17895 3.18214C8.34035 3.01786 8.42105 2.81429 8.42105 2.57143C8.42105 2.32857 8.34035 2.125 8.17895 1.96071C8.01754 1.79643 7.81754 1.71429 7.57895 1.71429C7.34035 1.71429 7.14035 1.79643 6.97895 1.96071C6.81754 2.125 6.73684 2.32857 6.73684 2.57143C6.73684 2.81429 6.81754 3.01786 6.97895 3.18214C7.14035 3.34643 7.34035 3.42857 7.57895 3.42857Z" fill="#D00E00" />
                </svg>
              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-red">
                  {statsLoading ? <Spinner animation="border" size="sm" /> : (pendingCount ?? 0)}
                </h5>
              </div>
            </div>
          </div>
        </div>

        {/* (rest of your unchanged layout below...) */}

        <div className="row card_wrapper_bg_grad p-4 row w-100 mx-auto d-none">
          {/* stat cards (hidden) */}
          <div className="col-md-3 col-sm-6">
            <div
              className="card stat-card text-white text-center p-3 card_bg_grad"
              role="button"
              onClick={() => router.push("/dashboard/task-new/taskcreated")}
              style={{ cursor: "pointer" }}
              title="View tasks you created"
            >
              <div className="icon-circle mb-2">{/* svg */}</div>
              <div className="card-data-wrap">
                <h5 className="mb-0 fw-bold">
                  {totalLoading ? <Spinner animation="border" size="sm" /> : totalCreatedTasks ?? 0}
                </h5>
                <small>My Created Tasks</small>
              </div>
            </div>
          </div>

          {/* ... other hidden stat cards ... */}
        </div>
      </div>

      <div className="container-fluid pb-5 px-0">
        <div className="row">
          <div className="col-lg-4">
            <TaskCompletionChart />
          </div>
          <div className="col-lg-8">
            <ProductivityChart />
          </div>
        </div>

        <div className="row col-lg-12">{/* Task preview moved to /tasks/preview */}</div>
      </div>

      {/* Modal (unchanged) */}
      <Modal
        contentClassName="border-0 rounded-4 g-shadow g-modal-conntent-wrapper p-4"
        show={show}
        onHide={() => setShow(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row">
            {/* Select Project */}
            <div className="col-md-4 mb-3">
              <Form.Label>Select Project</Form.Label>
              <div>
                <Dropdown
                  value={selectedProjectId}
                  options={projectOptions}
                  onChange={(e: any) => setSelectedProjectId(e.value)}
                  placeholder={loadingProjects ? "Loading projects..." : "Select"}
                  className="w-100"
                  disabled={loadingProjects || projectOptions.length === 0}
                />
                {loadingProjects && (
                  <div className="mt-2">
                    <Spinner animation="border" size="sm" /> Loading projects...
                  </div>
                )}
                {!loadingProjects && projectsError && <div className="mt-2 text-danger">Projects: {projectsError}</div>}
              </div>
            </div>

            {/* Title */}
            <div className="col-md-4 mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" placeholder="Enter task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Project Type */}
            <div className="col-md-4 mb-3">
              <Form.Label>Select Project Type</Form.Label>
              <Dropdown value={projectType} options={projectTypeOptions} onChange={(e: any) => setProjectType(e.value)} placeholder="Select a Project Type" className="w-100" />

              <Form.Check type="checkbox" label="Figma Design" className="mt-2" checked={showFigma} onChange={(e) => setShowFigma((e.target as HTMLInputElement).checked)} />
            </div>

            {/* Web Modules */}
            {(projectType === PROJECT_TYPES.WEB || projectType === PROJECT_TYPES.BOTH) && (
              <div className="col-md-6 mb-3">
                <Form.Label>Web Modules Description</Form.Label>
                <Form.Control as="textarea" placeholder="Enter web modules description" value={webDesc} onChange={(e) => setWebDesc(e.target.value)} />
              </div>
            )}

            {/* Mobile Modules */}
            {(projectType === PROJECT_TYPES.MOBILE || projectType === PROJECT_TYPES.BOTH) && (
              <div className="col-md-6 mb-3">
                <Form.Label>Mobile Modules Description</Form.Label>
                <Form.Control as="textarea" placeholder="Enter mobile modules description" value={mobileDesc} onChange={(e) => setMobileDesc(e.target.value)} />
              </div>
            )}

            {/* Figma Modules */}
            {showFigma && (
              <div className="col-md-6 mb-3">
                <Form.Label>Figma Modules Description</Form.Label>
                <Form.Control as="textarea" placeholder="Enter figma modules description" value={figmaDesc} onChange={(e) => setFigmaDesc(e.target.value)} />
              </div>
            )}
          </div>

          <div className="row">
            {/* Priority */}
            <div className="col-md-6 mb-3">
              <Form.Label>Priority</Form.Label>
              <Dropdown value={priority} options={priorityOptions} onChange={(e: any) => setPriority(e.value)} placeholder="Select Priority" className="w-100" />
            </div>

            {/* Deadline */}
            <div className="col-md-6 mb-3">
              <Form.Label>Deadline</Form.Label>
              <Form.Control type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            {/* Hours */}
            <div className="col-md-6 mb-3">
              <Form.Label>Estimated Hours</Form.Label>
              <Form.Control
                type="number"
                value={hours === "" ? "" : String(hours)}
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setHours(v === "" ? "" : Number(v));
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <Form.Label>Tags</Form.Label>
            <div className="row">
              {allTags.map((tag) => (
                <div className="col-md-4" key={tag}>
                  <Form.Check type="checkbox" label={tag} checked={tags.includes(tag)} onChange={(e) => handleTagChange(tag, (e.target as HTMLInputElement).checked)} />
                </div>
              ))}
            </div>
          </div>

          {saveError && <div className="text-danger mb-2">Error: {saveError}</div>}
        </Modal.Body>
        <Modal.Footer>
          <button className="g-btn" onClick={() => setShow(false)} disabled={saving}>
            Cancel
          </button>
          <button className="g-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Spinner animation="border" size="sm" /> Creating...
              </>
            ) : (
              "Create Task"
            )}
          </button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .stat-card {
          border: none;
          border-radius: 1.5rem;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          transition: transform 0.3s;
          display: flex;
          padding: 40px 20px !important;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        }

        .icon-circle {
          color: #8e44ad;
          background-color: #b980ff;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
        }

        .text-purple {
          color: #8e44ad;
        }

        .card-data-wrap h5 {
          font-size: 24px;
          font-weight: 500;
          text-align: end;
          margin-bottom: 14px !important;
        }

        .card-data-wrap small {
          font-size: 18px;
          font-weight: 500;
        }
      `}</style>
    </>
  );
}
