// app/dashboard/member-monitoring/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button as RBButton,
  Card,
  Spinner,
  Row,
  Col,
  Alert,
  Form,
} from 'react-bootstrap';
import { FaPlay, FaPause } from 'react-icons/fa';

interface ProjectOption {
  id: number;
  name: string;
}

type StatusResponse = {
  member: number;
  status: 'active' | 'paused';
  total_seconds: number;
};

export default function MonitoringPage() {
  // ─── State ───
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persist project selection
  useEffect(() => {
    const savedProj = localStorage.getItem('selectedProject');
    if (savedProj) {
      setSelectedProject(Number(savedProj));
    }
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  // Store when user changes project
  const handleProjectChange = (id: number) => {
    setSelectedProject(id);
    localStorage.setItem('selectedProject', id.toString());
  };

  // ─── Timer controls ───
  const startLocalTimer = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setSessionData(prev =>
        prev && prev.status === 'active'
          ? { ...prev, total_seconds: prev.total_seconds + 1 }
          : prev!
      );
    }, 1000);
  }, []);

  const stopLocalTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Load project list
  useEffect(() => {
    if (!token) return;
    fetch('http://127.0.0.1:8000/api/projects/', {
      headers: { Authorization: `Token ${token}` },
    })
      .then(res => res.json())
      .then((data: ProjectOption[]) => setProjects(data))
      .catch(() => setError('Failed to load projects'));
  }, [token]);

  // Fetch status
  const fetchStatus = useCallback(
    async (projectId: number) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/monitor/status/?project=${projectId}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!res.ok) throw new Error(await res.text());
        const data: StatusResponse = await res.json();
        setSessionData(data);
        data.status === 'active' ? startLocalTimer() : stopLocalTimer();
      } catch (err: any) {
        setError(err.message);
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    },
    [token, startLocalTimer, stopLocalTimer]
  );

  // React to project selection
  useEffect(() => {
    if (selectedProject !== null) {
      fetchStatus(selectedProject);
      const handler = () => fetchStatus(selectedProject);
      window.addEventListener('trackerStatusChanged', handler);
      return () => {
        window.removeEventListener('trackerStatusChanged', handler);
        stopLocalTimer();
      };
    }
  }, [selectedProject, fetchStatus, stopLocalTimer]);

  // Toggle start/stop
  const handleToggle = async () => {
    if (!token || selectedProject === null || !sessionData) return;
    setActionLoading(true);
    const action = sessionData.status === 'active' ? 'stop' : 'start';
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/monitor/${action}/?project=${selectedProject}`,
        { method: 'POST', headers: { Authorization: `Token ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const data: StatusResponse = await res.json();
      setSessionData(data);
      data.status === 'active' ? startLocalTimer() : stopLocalTimer();
      window.dispatchEvent(new CustomEvent('trackerStatusChanged'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format HH:MM:SS
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Render
  return (
    <div className="d-flex flex-column align-items-center py-5">
      <Card className="shadow" style={{ width: '360px' }}>
        <Card.Body>
          <Card.Title className="mb-4 text-center">Project Tracker</Card.Title>

          <Form.Select
            className="mb-4"
            value={selectedProject ?? ''}
            onChange={e => handleProjectChange(Number(e.target.value))}
          >
            <option value="" disabled>Select Project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Form.Select>

          {loading && <Spinner animation="border" className="d-block mx-auto mb-3" />}
          {error && <Alert variant="danger">{error}</Alert>}

          {sessionData && !loading && (
            <>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Status:</Col>
                <Col xs={8} className="text-capitalize">{sessionData.status}</Col>
              </Row>

              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Elapsed:</Col>
                <Col xs={8} style={{ fontFamily: 'monospace', fontSize: '1.25rem' }}>
                  {formatTime(sessionData.total_seconds)}
                </Col>
              </Row>

              <div className="text-center">
                <RBButton
                  variant={sessionData.status === 'active' ? 'danger' : 'success'}
                  onClick={handleToggle}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Spinner size="sm" className="me-2" /> : (
                    sessionData.status === 'active'
                      ? <><FaPause className="me-1" /> Pause</>
                      : <><FaPlay className="me-1" /> Start</>
                  )}
                </RBButton>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}