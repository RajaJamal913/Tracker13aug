// components/StartTracker.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import Spinner from 'react-bootstrap/Spinner';

/**
 * Tracker button that starts/stops a timer for a specific project.
 * Uses projectId prop or falls back to localStorage.
 */

type StatusResponse = { member: number; status: 'active' | 'paused'; total_seconds: number; };
interface StartTrackerProps { projectId?: number | null; }

// Ensure base includes trailing slash
const API_BASE = 'http://127.0.0.1:8000/api/monitor/';

export default function StartTracker({ projectId }: StartTrackerProps) {
  const effectiveProject = projectId ?? (
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('selectedProject')) || null
      : null
  );

  const [status, setStatus] = useState<'active' | 'paused' | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const startTimer = useCallback(() => {
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(() => setSeconds(prev => prev + 1), 1000);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // API helper: append slash to endpoint
  const apiFetch = useCallback(<T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    if (!token) return Promise.reject(new Error('No auth token'));
    if (!effectiveProject) return Promise.reject(new Error('No project selected'));

    // Ensure endpoint ends with slash
    const ep = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    const url = new URL(API_BASE + ep);
    url.searchParams.set('project', String(effectiveProject));
    console.log('Calling API:', url.toString(), options);

    return fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
      ...options,
    }).then(res => {
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json() as Promise<T>;
    });
  }, [token, effectiveProject]);

  const fetchStatus = useCallback(() => {
    if (!effectiveProject) return;
    setLoading(true);
    apiFetch<StatusResponse>('status')
      .then(data => {
        setStatus(data.status);
        setSeconds(data.total_seconds);
        data.status === 'active' ? startTimer() : stopTimer();
      })
      .catch(err => {
        console.error('fetchStatus error:', err);
        setStatus('paused');
        setSeconds(0);
      })
      .finally(() => setLoading(false));
  }, [apiFetch, startTimer, stopTimer, effectiveProject]);

  const toggle = useCallback(() => {
    if (!effectiveProject || !status) return;
    setActionLoading(true);
    const action = status === 'active' ? 'stop' : 'start';
    apiFetch<StatusResponse>(action, { method: 'POST' })
      .then(data => {
        setStatus(data.status);
        setSeconds(data.total_seconds);
        data.status === 'active' ? startTimer() : stopTimer();
        window.dispatchEvent(new CustomEvent('trackerStatusChanged'));
      })
      .catch(err => console.error('toggle error:', err))
      .finally(() => setActionLoading(false));
  }, [apiFetch, status, startTimer, stopTimer, effectiveProject]);

  useEffect(() => {
    fetchStatus();
    const handler = () => fetchStatus();
    window.addEventListener('trackerStatusChanged', handler);
    return () => {
      window.removeEventListener('trackerStatusChanged', handler);
      stopTimer();
    };
  }, [fetchStatus, stopTimer]);

  // Render UI
  if (!effectiveProject) {
    return (
      <button className="btn tracker-btn gap-2" disabled title="Select a project">
        <span className="ms-2 text-white fw-semibold">00:00:00</span>
        <div className="trk-play-icon">
           <img src="/assets/images/play-icon.png" alt="" />
        </div>
       
      </button>
    );
  }

  if (loading) {
    return (
      <button className="btn " disabled>
        <Spinner animation="border" size="sm" />
      </button>
    );
  }

  const variant = status === 'active' ? 'danger' : 'success';
  const icon = actionLoading
    ? <Spinner animation="border" size="sm" className="me-2" />
    : status === 'active' ? <img className='pause-icon' src="/assets/images/break-icon.png" alt="" /> : <FaPlay />;

  return (
    <button
      onClick={toggle}
      className={`btn d-flex align-items-center tracker-btn gap-2`}
      disabled={actionLoading}
      title={status === 'active' ? 'Pause' : 'Start'}
    >
      <span className="ms-2 text-white fw-semibold" style={{ fontFamily: 'monospace' }}>{formatTime(seconds)}</span>
      <div className="trk-play-icon">
      {icon}

      </div>
    </button>
  );
}
