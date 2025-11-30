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
                    <div className="col-md-3 col-sm-6">
                        <div className="card g-card border-blue">
                            <div className="icon mb-2 d-flex align-items-center justify-content-between">
                                <small>Total Task</small>
                                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0H2C0.9 0 0.0100002 0.9 0.0100002 2L0 18C0 19.1 0.89 20 1.99 20H14C15.1 20 16 19.1 16 18V6L10 0ZM6.94 16L3.4 12.46L4.81 11.05L6.93 13.17L11.17 8.93L12.58 10.34L6.94 16ZM9 7V1.5L14.5 7H9Z" fill="#2F6CE5" />
                            </svg>

                            
                            </div>
                            <div className="count">
                                <h5 className="mb-0 fw-bold">6</h5>
                                
                            </div>
                        </div>
                    </div>
                </div>


                <div className="row card_wrapper_bg_grad p-4 row w-100 mx-auto">
                    {/* stat cards */}
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

                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">{/* svg */}</div>
                            <div className="card-data-wrap">
                                <h5 className="mb-0 fw-bold">6</h5>
                                <small>Completed Task</small>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">{/* svg */}</div>
                            <div className="card-data-wrap">
                                <h5 className="mb-0 fw-bold">0</h5>
                                <small>Over Due Task</small>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 col-sm-6">
                        <div className="card stat-card text-white text-center p-3 card_bg_grad">
                            <div className="icon-circle mb-2">{/* svg */}</div>
                            <div className="card-data-wrap">
                                <h5 className="mb-0 fw-bold">9</h5>
                                <small>Pending Task</small>
                            </div>
                        </div>
                    </div>
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

            {/* Modal */}
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
                    <button className="g-btn-secondary" onClick={() => setShow(false)} disabled={saving}>
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