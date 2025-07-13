'use client';

import { useState, useEffect, useRef } from "react";
import {
  Button as RBButton,
  Card,
  Spinner,
  Row,
  Col,
  Alert,
} from "react-bootstrap";
import { FaPlay, FaPause } from "react-icons/fa";


type StatusResponse = {
  member: number;
  status: "active" | "paused";
  total_seconds: number;
};

export default function MonitoringPage() {
  // ─── State ───
  const [sessionData, setSessionData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // const intervalRef = useRef<NodeJS.Timer | null>(null);
  // build changes 
  const intervalRef = useRef<NodeJS.Timeout | null>(null);  // Changed from Timer to Timeout

  // ─── 1) On mount: read token from localStorage ───
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) {
      setError("No token found. Please log in.");
      setLoading(false);
      return;
    }
    setToken(saved);
  }, []);

  // ─── 2) Once we have a token, fetch current status ───
  useEffect(() => {
    if (!token) return;

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          "http://127.0.0.1:8000/api/monitor/status/",
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
            setError(`Failed to fetch status: ${text}`);
          }
          setSessionData(null);
          setLoading(false);
          return;
        }

        const data: StatusResponse = await res.json();
        setSessionData(data);
        setLastSync(new Date());

        if (data.status === "active") {
          startLocalTimer();
        }
      } catch (err) {
        setError("Network error while fetching status.");
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Cleanup: clear interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  // ─── 3) Local timer logic ───
  // const startLocalTimer = () => {
  //   if (intervalRef.current) return; 

  //   intervalRef.current = setInterval(() => {
  //     setSessionData((prev) => {
  //       if (prev && prev.status === "active") {
  //         return {
  //           ...prev,
  //           total_seconds: prev.total_seconds + 1,
  //         };
  //       }
  //       return prev!;
  //     });
  //   }, 1000);
  // };
// build change 
  const startLocalTimer = () => {
    if (intervalRef.current) return; // Already running

    intervalRef.current = setInterval(() => {
      setSessionData((prev) => {
        if (prev && prev.status === "active") {
          return {
            ...prev,
            total_seconds: prev.total_seconds + 1,
          };
        }
        return prev!;
      });
    }, 1000) as unknown as NodeJS.Timeout;  // Added type assertion
};

  const stopLocalTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ─── 4) Handle “Start” ───
  const handleStart = async () => {
    if (!token) {
      setError("Cannot start: no token found.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/monitor/start/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to start session: ${text}`);
        return;
      }

      const data: StatusResponse = await res.json();
      setSessionData(data);
      setLastSync(new Date());
      startLocalTimer();
    } catch {
      setError("Network error while starting session.");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── 5) Handle “Stop” ───
  const handleStop = async () => {
    if (!token) {
      setError("Cannot stop: no token found.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/monitor/stop/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to stop session: ${text}`);
        return;
      }

      const data: StatusResponse = await res.json();
      setSessionData(data);
      setLastSync(new Date());
      stopLocalTimer();
    } catch {
      setError("Network error while stopping session.");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── 6) Format HH:MM:SS ───
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // ─── 7) Render ───
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading…</span>
        </Spinner>
      </div>
    );
  }

  if (error && !sessionData) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (!sessionData) {
    // No data after loading & no error? This is a fallback.
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <p className="text-danger">
          Unable to load your session. Please make sure you’re logged in.
        </p>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center py-5">
      <Card className="shadow" style={{ width: "360px" }}>
        <Card.Body>
          <Card.Title className="mb-4 text-center">Your Timer</Card.Title>

          {error && (
            <Alert
              variant="danger"
              onClose={() => setError(null)}
              dismissible
              className="mb-3"
            >
              {error}
            </Alert>
          )}

          <Row className="mb-3">
            <Col xs={4} className="fw-bold">
              Status:
            </Col>
            <Col xs={8} className="text-capitalize">
              {sessionData.status}
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={4} className="fw-bold">
              Elapsed:
            </Col>
            <Col
              xs={8}
              style={{ fontFamily: "monospace", fontSize: "1.25rem" }}
            >
              {formatTime(sessionData.total_seconds)}
            </Col>
          </Row>

          {lastSync && (
            <Row className="mb-3">
              <Col xs={4} className="fw-bold">
                Last Sync:
              </Col>
              <Col xs={8} style={{ fontSize: "0.85rem" }}>
                {lastSync.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Col>
            </Row>
          )}

          <div className="text-center">
            <RBButton
              variant={sessionData.status === "active" ? "danger" : "success"}
              onClick={
                sessionData.status === "active" ? handleStop : handleStart
              }
              disabled={actionLoading}
              className="px-4"
            >
              {actionLoading && (
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
              )}
              {sessionData.status === "active" ? (
                <>
                  <FaPause className="me-1" /> Pause
                </>
              ) : (
                <>
                  <FaPlay className="me-1" /> Start
                </>
              )}
            </RBButton>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
