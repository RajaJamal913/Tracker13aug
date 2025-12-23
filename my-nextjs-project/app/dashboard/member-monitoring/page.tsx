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

  /* ─────────────────────────────────────
     Load token ONLY
  ───────────────────────────────────── */
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  /* ─────────────────────────────────────
     Load projects + VALIDATE saved project
  ───────────────────────────────────── */
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

  /* ─────────────────────────────────────
     Project change (manual)
  ───────────────────────────────────── */
  const handleProjectChange = (id: number) => {
    setSelectedProject(id);
    localStorage.setItem('selectedProject', id.toString());
  };

  /* ─────────────────────────────────────
     Timer helpers
  ───────────────────────────────────── */
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

  /* ─────────────────────────────────────
     Fetch status (SAFE)
  ───────────────────────────────────── */
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

  /* ─────────────────────────────────────
     React ONLY when project is valid
  ───────────────────────────────────── */
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

  /* ─────────────────────────────────────
     Toggle start / stop
  ───────────────────────────────────── */
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

  /* ─────────────────────────────────────
     Utils
  ───────────────────────────────────── */
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };


  // Render
  return (
    <div className="container">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2>Realtime Monitoring</h2>
        {/* <button type="button" className="btn btn-primary">+ Add Request</button> */}
        </div>
      <div className="row mb-4 g-4">
        <div className="col-md-3 col-sm-6">
          <div className="card g-card border-blue" role="button" title="View tasks you created">
            <div className="icon mb-2 d-flex align-items-center justify-content-between">
              <small className="txt-clr-blue">Online</small>
              <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.3636 15.1579V1.68421H1.63636V8.42105H0V1.68421C0 1.22105 0.160227 0.824561 0.480682 0.494737C0.801136 0.164912 1.18636 0 1.63636 0H16.3636C16.8136 0 17.1989 0.164912 17.5193 0.494737C17.8398 0.824561 18 1.22105 18 1.68421V13.4737C18 13.9368 17.8398 14.3333 17.5193 14.6632C17.1989 14.993 16.8136 15.1579 16.3636 15.1579ZM6.54545 9.26316C5.64545 9.26316 4.875 8.93333 4.23409 8.27368C3.59318 7.61403 3.27273 6.82105 3.27273 5.89474C3.27273 4.96842 3.59318 4.17544 4.23409 3.51579C4.875 2.85614 5.64545 2.52632 6.54545 2.52632C7.44545 2.52632 8.21591 2.85614 8.85682 3.51579C9.49773 4.17544 9.81818 4.96842 9.81818 5.89474C9.81818 6.82105 9.49773 7.61403 8.85682 8.27368C8.21591 8.93333 7.44545 9.26316 6.54545 9.26316ZM6.54545 7.57895C6.99545 7.57895 7.38068 7.41404 7.70114 7.08421C8.02159 6.75439 8.18182 6.35789 8.18182 5.89474C8.18182 5.43158 8.02159 5.03509 7.70114 4.70526C7.38068 4.37544 6.99545 4.21053 6.54545 4.21053C6.09545 4.21053 5.71023 4.37544 5.38977 4.70526C5.06932 5.03509 4.90909 5.43158 4.90909 5.89474C4.90909 6.35789 5.06932 6.75439 5.38977 7.08421C5.71023 7.41404 6.09545 7.57895 6.54545 7.57895ZM0 16V13.6421C0 13.1649 0.119318 12.7263 0.357955 12.3263C0.596591 11.9263 0.913636 11.6211 1.30909 11.4105C2.15455 10.9754 3.01364 10.6491 3.88636 10.4316C4.75909 10.214 5.64545 10.1053 6.54545 10.1053C7.44545 10.1053 8.33182 10.214 9.20455 10.4316C10.0773 10.6491 10.9364 10.9754 11.7818 11.4105C12.1773 11.6211 12.4943 11.9263 12.733 12.3263C12.9716 12.7263 13.0909 13.1649 13.0909 13.6421V16H0ZM1.63636 14.3158H11.4545V13.6421C11.4545 13.4877 11.417 13.3474 11.342 13.2211C11.267 13.0947 11.1682 12.9965 11.0455 12.9263C10.3091 12.5474 9.56591 12.2632 8.81591 12.0737C8.06591 11.8842 7.30909 11.7895 6.54545 11.7895C5.78182 11.7895 5.025 11.8842 4.275 12.0737C3.525 12.2632 2.78182 12.5474 2.04545 12.9263C1.92273 12.9965 1.82386 13.0947 1.74886 13.2211C1.67386 13.3474 1.63636 13.4877 1.63636 13.6421V14.3158Z" fill="#2F6CE5" />
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
              <small className="txt-clr-green">Working</small>
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
              <small className="txt-clr-yellow">Absent</small>
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
              <small className="txt-clr-red">Over Due</small>
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

 <div className="row mb-4">
  <div className="col-lg-12"><h5 className="">Time Request Data</h5></div>
<div className="col-lg-12">
            <div className="table-responsive g-table-wrap g-t-scroll mb-4">
              <table  className="text-center table g-table">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                    <th>Name</th>
                    <th>Project</th>
                    <th>Task</th>
                    <th>ActivityDesc</th>
                    <th>status</th>
                  </tr>
                </thead>
                <tbody>
                  {membersActivityData.map((activity, index) => (
                    <tr key={index} style={{ backgroundColor: "#F7ECFF" }}>
                      <td>{activity.Name}</td>
                      <td>{activity.Project}</td>
                      <td>{activity.Task}</td>

                      <td>{activity.ActivityDesc}</td>
                      <td>{activity.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>

  );
}