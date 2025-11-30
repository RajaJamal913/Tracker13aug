"use client";
export const dynamic = "force-dynamic";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect, FormEvent } from "react";
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

interface TimeRequest {
  id: number;
  user: number;
  project: number | { id: number; name: string };
  task: number | { id: number; title: string };
  date: string;
  time_from: string;
  time_to: string;
  requested_duration: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

// Safely read a cookie only in the browser
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
  // taskMap caches task details by id when API returned only numeric ids
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

  // helper to resolve project name whether API returned id or object
  const getProjectName = (r: TimeRequest) => {
    if (!r.project && r.project !== 0) return "—";
    if (typeof r.project === "object") return r.project.name ?? "—";
    // number: try to find in loaded projects
    const p = projects.find((pp) => pp.id === r.project);
    return p ? p.name : String(r.project);
  };

  // helper to resolve task title whether API returned id or object
  const getTaskTitle = (r: TimeRequest) => {
    if (!r.task && r.task !== 0) return "—";
    if (typeof r.task === "object") return r.task.title ?? "—";
    const t = taskMap[r.task as number];
    return t ? t.title : String(r.task);
  };

  // After loading requests, fetch missing task details (when API returns task as id)
  const populateTaskMap = async (list: TimeRequest[]) => {
    // collect numeric task ids
    const numericTaskIds = Array.from(
      new Set(
        list
          .map((r) => (typeof r.task === "number" ? (r.task as number) : null))
          .filter((id): id is number => id !== null)
      )
    ).filter((id) => !(id in taskMap)); // skip already cached
    if (numericTaskIds.length === 0) return;

    try {
      const opts = getAuthOptions();
      const fetches = numericTaskIds.map((id) =>
        fetch(`${API_BASE}/tasks/${id}/`, { ...opts }).then(async (res) => {
          if (!res.ok) {
            throw new Error(`task fetch ${id} failed ${res.status}`);
          }
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

  // Load all time-requests
  const loadRequests = async () => {
    setLoading(true);
    try {
      const opts = getAuthOptions();
      console.log("loadRequests opts:", opts);
      const res = await fetch(`${API_BASE}/time-requests/`, {
        method: "GET",
        ...opts,
      });
      console.log("loadRequests status:", res.status);
      if (res.status === 401) {
        console.warn("Unauthorized (401) when loading time requests. Check token or auth config.");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const json = await res.json();
      const list: TimeRequest[] = Array.isArray(json) ? json : json.results ?? [];
      const grouped = { PENDING: [], APPROVED: [], REJECTED: [] } as Record<string, any>;
      list.forEach((r) => grouped[r.status].push(r));
      setRequests(grouped);

      // fetch any missing task details (if API returned task ids rather than nested objects)
      await populateTaskMap(list);
    } catch (e) {
      console.error("loadRequests failed:", e);
      setRequests({ PENDING: [], APPROVED: [], REJECTED: [] });
    } finally {
      setLoading(false);
    }
  };

  // Load projects
  const loadProjects = async () => {
    try {
      const opts = getAuthOptions();
      console.log("loadProjects opts:", opts);
      const res = await fetch(`${API_BASE}/projects/`, {
        ...opts,
      });
      console.log("loadProjects status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      setProjects(await res.json());
    } catch (e) {
      console.error("loadProjects failed:", e);
      setProjects([]);
    }
  };

  // Load tasks whenever project changes (for the form's task dropdown)
  useEffect(() => {
    if (!formData.project) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const opts = getAuthOptions();
        const res = await fetch(`${API_BASE}/tasks/?project=${formData.project!.id}`, {
          ...opts,
        });
        console.log("loadTasks status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
        setTasks(await res.json());
      } catch (e) {
        console.error("loadTasks failed:", e);
        setTasks([]);
      }
    })();
  }, [formData.project]);

  useEffect(() => {
    // initial load
    loadRequests();
    loadProjects();
  }, []);

  const openAdd = () => {
    setEditRequest(null);
    setFormData({ project: null, task: null, date: "", timeFrom: "", timeTo: "", description: "", status: "PENDING" });
    setShowModal(true);
  };

  const openEdit = (r: TimeRequest) => {
    // normalize incoming shapes if they are objects or ids
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

    const url = editRequest ? `${API_BASE}/time-requests/${editRequest.id}/` : `${API_BASE}/time-requests/`;
    const method = editRequest ? "PATCH" : "POST";

    try {
      const opts = getAuthOptions();
      console.log("Submitting to", url, "opts:", opts, "payload:", payload);
      const res = await fetch(url, {
        method,
        ...opts,
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("Save status:", res.status, "response:", text);

      if (!res.ok) {
        let message = text;
        try {
          const j = JSON.parse(text);
          message = JSON.stringify(j);
        } catch (err) { }
        throw new Error(`Save failed: ${res.status} ${message}`);
      }

      await loadRequests();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    }
  };

  const renderTable = (status: string) => (
    <>
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-blue" role="button" title="View tasks you created">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-blue">Approved Request</small>
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0H2C0.9 0 0.0100002 0.9 0.0100002 2L0 18C0 19.1 0.89 20 1.99 20H14C15.1 20 16 19.1 16 18V6L10 0ZM6.94 16L3.4 12.46L4.81 11.05L6.93 13.17L11.17 8.93L12.58 10.34L6.94 16ZM9 7V1.5L14.5 7H9Z" fill="#2F6CE5" />
                </svg>



              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-blue">6</h5>

              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-green">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-green">Pending Request</small>
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM3.55556 14.4H9.77778V12.6H3.55556V14.4ZM3.55556 10.8H12.4444V9H3.55556V10.8ZM3.55556 7.2H12.4444V5.4H3.55556V7.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#22C55E" />
                </svg>




              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-green">6</h5>

              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-yellow">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-yellow">Holiday</small>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.02428 0.175747C0.78997 -0.0585756 0.410062 -0.0585837 0.175747 0.175731C-0.0585756 0.410046 -0.0585837 0.789954 0.175731 1.02427L4.85958 5.70822C4.3547 5.91968 4.00001 6.41847 4.00001 7.00008V8.00009H5.20002V7.00008L5.2053 6.95424C5.22603 6.86592 5.30534 6.80008 5.40002 6.80008H5.95145L7.94913 8.79778H1.39925C0.832154 8.79778 0.581575 9.51187 1.0243 9.86627L4.80001 12.8885V14.2038C4.80001 15.198 5.60591 16.0039 6.59999 16.0039H9.39635C10.3905 16.0039 11.1964 15.198 11.1964 14.2038V12.8884L11.6647 12.5134L14.9757 15.8246C15.21 16.0589 15.5899 16.0589 15.8243 15.8246C16.0586 15.5903 16.0586 15.2103 15.8243 14.976L1.02428 0.175747ZM10.8109 11.6597L10.2213 12.1318C10.0792 12.2457 9.99635 12.418 9.99635 12.6001V14.2038C9.99635 14.5352 9.72771 14.8038 9.39635 14.8038H6.59999C6.26866 14.8038 6.00003 14.5352 6.00003 14.2038V12.6001C6.00003 12.418 5.91723 12.2456 5.77497 12.1317L3.10901 9.99779H9.14906L10.8109 11.6597Z" fill="#D08700" />
                  <path d="M8.00008 4.80005C7.72496 4.80005 7.46064 4.75376 7.21455 4.66852L5.73161 3.18559C5.64639 2.93945 5.6001 2.67514 5.6001 2.40003C5.6001 1.07452 6.67463 0 8.00008 0C9.32562 0 10.4001 1.07452 10.4001 2.40003C10.4001 3.72552 9.32562 4.80005 8.00008 4.80005ZM8.00008 1.20001C7.33736 1.20001 6.80007 1.73728 6.80007 2.40003C6.80007 3.06277 7.33736 3.60004 8.00008 3.60004C8.66289 3.60004 9.2001 3.06277 9.2001 2.40003C9.2001 1.73728 8.66289 1.20001 8.00008 1.20001Z" fill="#D08700" />
                  <path d="M14.5957 8.80078H11.3433L13.5495 11.0071L14.9707 9.86919C15.4134 9.51471 15.1627 8.80078 14.5957 8.80078Z" fill="#D08700" />
                  <path d="M9.34593 6.79959L8.146 5.59961H10.5963C11.3308 5.59961 11.9332 6.1653 11.9916 6.88479L11.9963 6.99959V7.9996H10.7963V6.99959C10.7963 6.90495 10.7304 6.82559 10.6421 6.80487L10.5963 6.79959H9.34593Z" fill="#D08700" />
                </svg>





              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-yellow">6</h5>

              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card g-card border-red">
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="txt-clr-red">Reject Request</small>
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.77778 18C1.28889 18 0.87037 17.8237 0.522222 17.4712C0.174074 17.1187 0 16.695 0 16.2V3.6C0 3.105 0.174074 2.68125 0.522222 2.32875C0.87037 1.97625 1.28889 1.8 1.77778 1.8H5.51111C5.7037 1.26 6.02593 0.825 6.47778 0.495C6.92963 0.165 7.43704 0 8 0C8.56296 0 9.07037 0.165 9.52222 0.495C9.97407 0.825 10.2963 1.26 10.4889 1.8H14.2222C14.7111 1.8 15.1296 1.97625 15.4778 2.32875C15.8259 2.68125 16 3.105 16 3.6V16.2C16 16.695 15.8259 17.1187 15.4778 17.4712C15.1296 17.8237 14.7111 18 14.2222 18H1.77778ZM1.77778 16.2H14.2222V3.6H1.77778V16.2ZM3.55556 14.4H9.77778V12.6H3.55556V14.4ZM3.55556 10.8H12.4444V9H3.55556V10.8ZM3.55556 7.2H12.4444V5.4H3.55556V7.2ZM8 2.925C8.19259 2.925 8.35185 2.86125 8.47778 2.73375C8.6037 2.60625 8.66667 2.445 8.66667 2.25C8.66667 2.055 8.6037 1.89375 8.47778 1.76625C8.35185 1.63875 8.19259 1.575 8 1.575C7.80741 1.575 7.64815 1.63875 7.52222 1.76625C7.3963 1.89375 7.33333 2.055 7.33333 2.25C7.33333 2.445 7.3963 2.60625 7.52222 2.73375C7.64815 2.86125 7.80741 2.925 8 2.925Z" fill="#D00E00" />
                  <path d="M15 2.5L1 17" stroke="#D00E00" stroke-width="2" />
                </svg>




              </div>
              <div className="count">
                <h5 className="mb-0 fw-bold txt-clr-red">6</h5>

              </div>
            </div>
          </div>
        </div>



      
      <Table className="table-responsive g-table">
        <thead className="table-primary">
          <tr>
            <th>Member</th>
            <th>Project</th>
            <th>Task</th>
            <th>Date</th>
            <th>Requested Duration</th>
            <th>Time Range</th>
            <th>Status</th>
            {status === "PENDING" && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {requests[status].map((r) => (
            <tr key={r.id}>
              <td>{r.user}</td>
              <td>{getProjectName(r)}</td>
              <td>{getTaskTitle(r)}</td>
              <td>{r.date}</td>
              <td>{r.requested_duration}</td>
              <td>{`${r.time_from} - ${r.time_to}`}</td>
              <td>{r.status}</td>
              {status === "PENDING" && (
                <td>
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      </div>
    </>




  );

  return (
    <div className="container-fluid mt-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2>Time Request</h2>
        <Button onClick={openAdd}>+ Add Request</Button>
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
          <h5 className="mt-4">Time Request Data</h5>
          {renderTable(activeTab)}
        </>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
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
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editRequest ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
