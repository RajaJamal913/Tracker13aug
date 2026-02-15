'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface ProjectOption {
  id: number;
  name: string;
}

type StatusResponse = {
  member: number;
  status: 'active' | 'paused';
  total_seconds: number;
};

// Example member list used to compute totals on the cards.
// Replace with API-driven list if you have a members endpoint.
const membersActivityData = [
  { Name: 'Hamza', Project: 'Law website design', Task: 'Hamza', ActivityDesc: 'NA', status: 'In Progress' },
  { Name: 'Jamal', Project: 'CRM website design', Task: 'Hamza', ActivityDesc: 'NA', status: 'Not Started' },
];

export default function MonitoringPage() {
  // ─── State ───
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/api/projects/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
      .then((data: ProjectOption[]) => {
        setProjects(data);

        const saved = localStorage.getItem('selectedProject');
        const savedId = saved ? Number(saved) : null;

        if (savedId && data.some(p => p.id === savedId)) {
          setSelectedProject(savedId);
        } else if (data.length > 0) {
          setSelectedProject(data[0].id);
          localStorage.setItem('selectedProject', data[0].id.toString());
        } else {
          setSelectedProject(null);
          localStorage.removeItem('selectedProject');
        }
      })
      .catch(() => setError('Failed to load projects'));
  }, [token]);

  const handleProjectChange = (id: number) => {
    setSelectedProject(id);
    localStorage.setItem('selectedProject', id.toString());
  };

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

  const fetchStatus = useCallback(
    async (projectId: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/monitor/status/?project=${projectId}`,
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

  useEffect(() => {
    if (!selectedProject || projects.length === 0) return;

    fetchStatus(selectedProject);

    const handler = () => fetchStatus(selectedProject);
    window.addEventListener('trackerStatusChanged', handler);

    return () => {
      window.removeEventListener('trackerStatusChanged', handler);
      stopLocalTimer();
    };
  }, [selectedProject, projects, fetchStatus, stopLocalTimer]);

  const handleToggle = async () => {
    if (!token || !selectedProject || !sessionData) return;

    setActionLoading(true);
    const action = sessionData.status === 'active' ? 'stop' : 'start';

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/monitor/${action}/?project=${selectedProject}`,
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

  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ─── Dynamic card counts
  const totalMembers = membersActivityData.length;

  const counts = useMemo(() => {
    // Business rule implemented below:
    // - If the tracker (sessionData) is active, mark 1 member as Online & Working and the rest as Present (not absent)
    // - If tracker is not active (or no session), mark all members as Absent
    const isActive = sessionData?.status === 'active';

    const online = isActive ? 1 : 0;
    const working = isActive ? 1 : 0;
    const absent = isActive ? Math.max(0, totalMembers - online) : totalMembers;

    // Overdue is derived from sample data; replace by real logic if available.
    const overdue = membersActivityData.filter(m => (m.status || '').toLowerCase().includes('over')).length;

    return { online, working, absent, overdue };
  }, [sessionData, totalMembers]);

  const cardClass = (hasValue: boolean, defaultClass: string) =>
    `${defaultClass} ${hasValue ? 'g-card-active' : 'g-card-muted'}`;

  return (
    <div className="container">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2>Realtime Monitoring</h2>
      </div>

      <div className="row mb-4 g-4">
        <div className="col-md-3 col-sm-6">
          <div className={cardClass(counts.online > 0, 'card g-card border-blue')} role="button" title="Online members">
            <div className="icon mb-2 d-flex align-items-center justify-content-between">
              <small className="txt-clr-blue">Online</small>
              {/* SVG omitted for brevity - kept original icon in the project */}
            </div>
            <div className="count">
              <h5 className="mb-0 fw-bold txt-clr-blue">{counts.online}</h5>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className={cardClass(counts.working > 0, 'card g-card border-green')}>
            <div className="icon mb-2 d-flex align-items-center justify-content-between">
              <small className="txt-clr-green">Working</small>
            </div>
            <div className="count">
              <h5 className="mb-0 fw-bold txt-clr-green">{counts.working}</h5>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className={cardClass(counts.absent > 0, 'card g-card border-yellow')}>
            <div className="icon mb-2 d-flex align-items-center justify-content-between">
              <small className="txt-clr-yellow">Absent</small>
            </div>
            <div className="count">
              <h5 className="mb-0 fw-bold txt-clr-yellow">{counts.absent}</h5>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className={cardClass(counts.overdue > 0, 'card g-card border-red')}>
            <div className="icon mb-2 d-flex align-items-center justify-content-between">
              <small className="txt-clr-red">Over Due</small>
            </div>
            <div className="count">
              <h5 className="mb-0 fw-bold txt-clr-red">{counts.overdue}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-12">
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

                {!sessionData && !loading && (
                  <div className="text-center text-muted">No tracker data for selected project.</div>
                )}

              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
