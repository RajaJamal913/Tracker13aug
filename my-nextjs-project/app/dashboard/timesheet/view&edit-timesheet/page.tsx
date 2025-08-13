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
  project: { id: number; name: string };
  task: { id: number; title: string };
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

export default function TimeRequestTabs() {
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [requests, setRequests] = useState<Record<string, TimeRequest[]>>({
    PENDING: [],
    APPROVED: [],
    REJECTED: [],
  });
  const [projects, setProjects] = useState<Project[]>([]);
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

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const csrftoken = getCookie("csrftoken");

  // Load all time-requests
  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/time-requests/`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: TimeRequest[] = Array.isArray(json) ? json : json.results ?? [];
      const grouped = { PENDING: [], APPROVED: [], REJECTED: [] } as Record<string, any>;
      list.forEach((r) => grouped[r.status].push(r));
      setRequests(grouped);
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
      const res = await fetch(`${API_BASE}/projects/`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjects(await res.json());
    } catch (e) {
      console.error("loadProjects failed:", e);
    }
  };

  // Load tasks whenever project changes
  useEffect(() => {
    if (!formData.project) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/tasks/?project=${formData.project!.id}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTasks(await res.json());
      } catch (e) {
        console.error("loadTasks failed:", e);
        setTasks([]);
      }
    })();
  }, [formData.project]);

  useEffect(() => {
    loadRequests();
    loadProjects();
  }, []);

  const openAdd = () => {
    setEditRequest(null);
    setFormData({ project: null, task: null, date: "", timeFrom: "", timeTo: "", description: "", status: "PENDING" });
    setShowModal(true);
  };

  const openEdit = (r: TimeRequest) => {
    setEditRequest(r);
    setFormData({ project: r.project, task: r.task, date: r.date, timeFrom: r.time_from, timeTo: r.time_to, description: r.description, status: r.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const [h1, m1] = formData.timeFrom.split(":");
    const [h2, m2] = formData.timeTo.split(":");
    const payload = {
      project: formData.project!.id,
      task: formData.task!.id,
      date: formData.date,
      time_from: `${h1.padStart(2, "0")} : ${m1.padStart(2, "0")} : 00`,
      time_to: `${h2.padStart(2, "0")} : ${m2.padStart(2, "0")} : 00`,
      description: formData.description,
      status: formData.status,
    };
    const url = editRequest ? `${API_BASE}/time-requests/${editRequest.id}/` : `${API_BASE}/time-requests/`;
    const method = editRequest ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken, ...(token ? { Authorization: `Token ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Save failed", await res.text());
      return;
    }
    await loadRequests();
    setShowModal(false);
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
            <td>{r.project.name}</td>
            <td>{r.task.title}</td>
            <td>{r.date}</td>
            <td>{r.requested_duration}</td>
            <td>{`${r.time_from} - ${r.time_to}`}</td>
            <td>{r.status}</td>
            {status === "PENDING" && (
              <td>
                <Button size="sm" variant="outline-primary" onClick={() => openEdit(r)}>Edit</Button>
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
            <Nav.Item><Nav.Link eventKey="PENDING">Pending</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="APPROVED">Approved</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="REJECTED">Rejected</Nav.Link></Nav.Item>
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
                  onChange={(e: any) => { setFormData({ ...formData, project: e.value, task: null }); }}
                  optionLabel="name"
                  placeholder="Select a Project"
                  filter showClear className="w-100"
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
                  filter showClear className="w-100"
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