"use client";

import { useState, useEffect } from "react";
import { Table, Button, Spinner, Modal } from "react-bootstrap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faCheck,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { Dropdown } from "primereact/dropdown";

interface LeavePolicy {
  id: number;
  name: string;
  is_paid: boolean;
}

interface LeaveRequest {
  id: number;
  member: number;
  member_username: string;
  policy: number;
  policy_name: string;
  paid: boolean;
  reason: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: "pending" | "approved" | "rejected";
  created_on: string;
  created_by: number;
  created_by_username: string;
  approved_on: string | null;
  approved_by: number | null;
  approved_by_username: string | null;
  rejection_reason: string | null;
}

const API_BASE = "http://127.0.0.1:8000/api"; // adjust if needed

export default function ProfileTabs() {
  // ─── Auth & Loading States ───
  const [token, setToken] = useState<string | null>(null);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Tabs & Data ───
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);

  // ─── Modals ───
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRequestForm, setNewRequestForm] = useState<{
    policy: number | null;
    start_date: string;
    end_date: string;
    reason: string;
  }>({
    policy: null,
    start_date: "",
    end_date: "",
    reason: "",
  });

  // ─── Fetch token on mount ───
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) {
      setError("No token found. Please log in.");
      setLoadingRequests(false);
      setLoadingPolicies(false);
      return;
    }
    setToken(saved);
  }, []);

  // ─── Fetch leave policies ───
  useEffect(() => {
    if (!token) return;
    setLoadingPolicies(true);
    fetch(`${API_BASE}/leave-policies/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error fetching policies: ${res.statusText}`);
        return res.json();
      })
      .then((data: LeavePolicy[]) => {
        setLeavePolicies(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load leave policies.");
      })
      .finally(() => setLoadingPolicies(false));
  }, [token]);

  // ─── Fetch leave requests when activeTab or token changes ───
  useEffect(() => {
    if (!token) return;
    setLoadingRequests(true);
    fetch(`${API_BASE}/leaves/?status=${activeTab}`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error fetching requests: ${res.statusText}`);
        return res.json();
      })
      .then((data: LeaveRequest[]) => {
        setRequests(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load leave requests.");
      })
      .finally(() => setLoadingRequests(false));
  }, [activeTab, token]);

  // ─── Approve a request ───
  const handleApprove = (req: LeaveRequest) => {
    if (!token) return;
    fetch(`${API_BASE}/leaves/${req.id}/approve/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error approving: ${res.statusText}`);
        return res.json();
      })
      .then(() => {
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to approve request.");
      });
  };

  // ─── Open reject modal ───
  const handleOpenReject = (req: LeaveRequest) => {
    setRejectingRequest(req);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  // ─── Confirm rejection ───
  const handleRejectConfirm = () => {
    if (!token || !rejectingRequest) return;
    fetch(`${API_BASE}/leaves/${rejectingRequest.id}/reject/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error rejecting: ${res.statusText}`);
        return res.json();
      })
      .then(() => {
        setRequests((prev) => prev.filter((r) => r.id !== rejectingRequest.id));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to reject request.");
      })
      .finally(() => {
        setShowRejectModal(false);
        setRejectingRequest(null);
        setRejectionReason("");
      });
  };

  // ─── Create a new leave request ───
  const handleCreateLeave = () => {
    if (
      !token ||
      !newRequestForm.policy ||
      !newRequestForm.start_date ||
      !newRequestForm.end_date ||
      !newRequestForm.reason
    ) {
      alert("Please fill out all fields.");
      return;
    }
    fetch(`${API_BASE}/leaves/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        policy: newRequestForm.policy,
        start_date: newRequestForm.start_date,
        end_date: newRequestForm.end_date,
        reason: newRequestForm.reason,
      }),
    })
      .then((res) => {
        if (res.status === 400) return res.json().then((e) => Promise.reject(e));
        if (!res.ok) throw new Error(`Error creating leave: ${res.statusText}`);
        return res.json();
      })
      .then((created: LeaveRequest) => {
        if (activeTab === "pending") {
          setRequests((prev) => [created, ...prev]);
        }
        setShowAddModal(false);
        setNewRequestForm({ policy: null, start_date: "", end_date: "", reason: "" });
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to create leave request.");
      });
  };

  // ─── Delete a leave request ───
  const handleDelete = (req: LeaveRequest) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this request?")) return;
    fetch(`${API_BASE}/leaves/${req.id}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        if (res.status !== 204) throw new Error(`Error deleting: ${res.statusText}`);
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to delete leave request.");
      });
  };

  // ─── Render table rows by tab ───
  const renderRows = () => {
    if (loadingRequests) {
      return (
        <tr>
          <td colSpan={11} className="text-center py-4">
            <Spinner animation="border" />
          </td>
        </tr>
      );
    }
    if (requests.length === 0) {
      return (
        <tr>
          <td colSpan={11} className="text-center py-4">
            No {activeTab} requests found.
          </td>
        </tr>
      );
    }

    return requests.map((req) => (
      <tr key={req.id}>
        <td className="fw-bold">{req.member_username}</td>
        <td>{req.policy_name}</td>
        <td>{req.reason}</td>
        <td>{req.paid ? "Yes" : "No"}</td>
        <td>{new Date(req.created_on).toLocaleDateString()}</td>
        {activeTab === "rejected" && <td>{req.rejection_reason}</td>}
        <td>{req.created_by_username}</td>
        {activeTab !== "pending" && <td>{req.approved_by_username || "-"}</td>}
        <td>{req.start_date}</td>
        <td>{req.end_date}</td>
        <td>{req.total_days} day{req.total_days > 1 ? "s" : ""}</td>
        <td>
          {activeTab === "pending" && (
            <div className="d-flex align-items-center">
              <Button
                variant="outline-success"
                size="sm"
                className="me-2"
                onClick={() => handleApprove(req)}
              >
                <FontAwesomeIcon icon={faCheck} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="me-2"
                onClick={() => handleOpenReject(req)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(req)}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </Button>
            </div>
          )}
          {activeTab !== "pending" && (
            <div className="d-flex align-items-center">
              <Button variant="outline-primary" size="sm" className="me-2" disabled>
                <FontAwesomeIcon icon={faEdit} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(req)}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </Button>
            </div>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="container">
      {/* Tab Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 tabContainer profile-settings-tabs-wrapper">
        <div className="d-flex um-btns-wrap">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 tabButton py-2 ${
                activeTab === tab ? "active" : "text-gray-500"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <Button
            variant="btn g-btn"
            className="me-2"
            onClick={() => setShowAddModal(true)}
          >
            + Add Leave
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="text-center g-table table min-w-12">
          <thead>
            <tr>
              <th>Member</th>
              <th>Policy</th>
              <th>Reason</th>
              <th>Paid</th>
              <th>Created On</th>
              {activeTab === "rejected" && <th>Rejection Reason</th>}
              <th>Created By</th>
              {activeTab !== "pending" && <th>Approved By</th>}
              <th>Start</th>
              <th>End</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Leave request by{" "}
            <strong>{rejectingRequest?.member_username}</strong> from{" "}
            <strong>{rejectingRequest?.start_date}</strong> to{" "}
            <strong>{rejectingRequest?.end_date}</strong>.
          </p>
          <div className="mb-3">
            <label className="form-label">Reason for rejection</label>
            <textarea
              className="form-control"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            ></textarea>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRejectConfirm}>
            Reject
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Leave Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Leave</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingPolicies ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : (
            <form>
              <div className="mb-3">
                <label className="form-label">
                  Leave Policy<span className="text-danger">*</span>
                </label>
                <Dropdown
                  value={newRequestForm.policy}
                  options={leavePolicies.map((p) => ({
                    label: p.name,
                    value: p.id,
                  }))}
                  onChange={(e) =>
                    setNewRequestForm({
                      ...newRequestForm,
                      policy: e.value,
                    })
                  }
                  placeholder="Select Leave Policy"
                  className="w-100"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Start Date<span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={newRequestForm.start_date}
                  onChange={(e) =>
                    setNewRequestForm({
                      ...newRequestForm,
                      start_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  End Date<span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={newRequestForm.end_date}
                  onChange={(e) =>
                    setNewRequestForm({
                      ...newRequestForm,
                      end_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Reason<span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={newRequestForm.reason}
                  onChange={(e) =>
                    setNewRequestForm({
                      ...newRequestForm,
                      reason: e.target.value,
                    })
                  }
                ></textarea>
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <button className="g-btn" onClick={handleCreateLeave}>
            Request Leave
          </button>
        </Modal.Footer>
      </Modal>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger mt-4" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
