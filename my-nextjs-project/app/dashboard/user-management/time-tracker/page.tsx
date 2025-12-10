"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Spinner,
  Row,
  Col,
  Alert,
  Container,
} from "react-bootstrap";

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface MemberStatus {
  id: number;
  name: string;
  status: "active" | "paused";
  total_seconds: number;
}

export default function TrackingPage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 1) Read token on mount
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) {
      setError("No token found. Please log in.");
      setLoading(false);
      return;
    }
    setToken(saved);
  }, []);

  // 2) Fetch members' statuses once token is set
  useEffect(() => {
    if (!token) return;

    const fetchMembersStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/monitor/members-status/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
          }
        );

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError("Authentication failed. Please log in again.");
          } else {
            const text = await res.text();
            setError(`Failed to fetch members' status: ${text}`);
          }
          setMembers([]);
          setLoading(false);
          return;
        }

        const data: MemberStatus[] = await res.json();
        setMembers(data);
      } catch {
        setError("Network error while fetching members' status.");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembersStatus();
  }, [token]);

  // 3) Format seconds → "HH:MM:SS"
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // 4) Render loading / error / empty
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading…</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center mt-5">
        <p>No members are currently being tracked.</p>
      </div>
    );
  }

  // 5) Main grid once data is available
  return (
    <Container fluid className="pb-4 ">
      
      <h2 className="page-heading-wrapper mb-4">Team Tracking Overview</h2>
      <Row>
        {members.map((member) => (
          <Col key={member.id} lg={4} md={6} sm={12} className="mb-4">
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong>{member.name}</strong>
                  <span
                    className={`badge ${
                      member.status === "active" ? "bg-success" : "g-theme-bg"
                    }`}
                  >
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Elapsed Time:</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatTime(member.total_seconds)}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}