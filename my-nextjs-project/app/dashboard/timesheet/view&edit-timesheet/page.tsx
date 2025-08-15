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
        } catch (err) {}
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
