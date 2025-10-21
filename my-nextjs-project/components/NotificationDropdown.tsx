"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dropdown, Spinner, Button, Badge } from "react-bootstrap";
import Link from "next/link";
import Image from "next/image";

interface Notification {
  id: number;
  time_request_id?: number | null;
  task_id?: number | null;
  verb: string;
  created_at: string;
  is_read: boolean;
}

interface TimeRequest {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Task {
  id: number;
  title?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(^|;)\\s*${name}=\\s*([^;]+)`));
  return m ? m[2] : "";
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [requestsMap, setRequestsMap] = useState<Record<number, TimeRequest>>({});
  const [tasksMap, setTasksMap] = useState<Record<number, Task>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedAtRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const safeFetchJson = useCallback(async (url: string, controller?: AbortController) => {
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        signal: controller?.signal,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      if (err?.name === "AbortError") return null;
      console.debug("safeFetchJson error", url, err);
      return null;
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setRequestsMap({});
      setTasksMap({});
      return;
    }

    const now = Date.now();
    if (lastFetchedAtRef.current && now - lastFetchedAtRef.current < 1000) {
      return;
    }
    lastFetchedAtRef.current = now;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/notifications/`;
      const raw = await safeFetchJson(url, controller);
      if (!raw) {
        setNotifications([]);
        setRequestsMap({});
        setTasksMap({});
        return;
      }

      let data: Notification[] = [];
      if (Array.isArray(raw)) data = raw;
      else if (raw && Array.isArray((raw as any).results)) data = (raw as any).results;
      else if (raw && Array.isArray(raw.notifications)) data = (raw as any).notifications;
      else data = [];

      data = data.slice().sort((a, b) => (new Date(b.created_at).getTime()) - (new Date(a.created_at).getTime()));

      setNotifications(data);

      const timeRequestIds: number[] = Array.from(new Set(data.map((n) => n.time_request_id).filter(Boolean))) as number[];
      const taskIds: number[] = Array.from(new Set(data.map((n) => n.task_id).filter(Boolean))) as number[];

      const fetchList = async <T,>(ids: number[], basePath: string): Promise<Record<number, T>> => {
        const map: Record<number, T> = {};
        if (!ids || ids.length === 0) return map;

        await Promise.all(ids.map(async (id) => {
          const item = await safeFetchJson(`${API_BASE}/${basePath}/${id}/`, controller);
          if (item) {
            map[id] = item as T;
          }
        }));
        return map;
      };

      const [reqMap, tMap] = await Promise.all([
        fetchList<TimeRequest>(timeRequestIds, "time-requests"),
        fetchList<Task>(taskIds, "tasksai"),
      ]);

      setRequestsMap(reqMap);
      setTasksMap(tMap);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      console.error("Failed loading notifications", err);
      setError(err?.message ?? "Failed loading notifications");
    } finally {
      setLoading(false);
    }
  }, [safeFetchJson, token]);

  const handleToggle = (isOpen: boolean) => {
    if (!isOpen) return;
    if (notifications === null || (notifications && notifications.length === 0 && !loading)) {
      fetchNotifications();
    } else {
      const last = lastFetchedAtRef.current ?? 0;
      if (Date.now() - last > 30000) fetchNotifications();
    }
  };

  const markRead = async (notifId: number) => {
    setNotifications((prev) => prev?.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)) ?? prev);

    if (!token) return;

    const csrftoken = getCookie("csrftoken");
    try {
      const res = await fetch(`${API_BASE}/notifications/${notifId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ is_read: true }),
      });
      if (!res.ok) {
        setNotifications((prev) => prev?.map((n) => (n.id === notifId ? { ...n, is_read: false } : n)) ?? prev);
      }
    } catch (err) {
      console.error("Failed marking notification read", err);
      setNotifications((prev) => prev?.map((n) => (n.id === notifId ? { ...n, is_read: false } : n)) ?? prev);
    }
  };

  const markAllRead = async () => {
    if (!notifications || notifications.length === 0) return;
    setNotifications((prev) => prev?.map((n) => ({ ...n, is_read: true })) ?? prev);

    if (!token) return;

    const csrftoken = getCookie("csrftoken");
    try {
      await Promise.all(notifications.map(n =>
        fetch(`${API_BASE}/notifications/${n.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
          body: JSON.stringify({ is_read: true })
        }).catch((err) => {
          console.debug("markAllRead item failed", n.id, err);
        })
      ));
    } catch (err) {
      console.warn("markAllRead encountered errors, refreshing list", err);
      fetchNotifications();
    }
  };

  const changeStatus = async (notif: Notification, newStatus: "APPROVED" | "REJECTED") => {
    if (!notif.time_request_id) return;
    const csrftoken = getCookie("csrftoken");

    setRequestsMap((m) => ({
      ...m,
      [notif.time_request_id!]: { ...(m[notif.time_request_id!] || {}), status: newStatus },
    }));

    try {
      const res = await fetch(`${API_BASE}/time-requests/${notif.time_request_id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const fresh = await safeFetchJson(`${API_BASE}/time-requests/${notif.time_request_id}/`);
        if (fresh) {
          setRequestsMap((m) => ({ ...m, [notif.time_request_id!]: fresh }));
        }
      } else {
        await markRead(notif.id);
      }
    } catch (err) {
      console.error("Failed changing status", err);
    }
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dropdown className="notification-dropdown" onToggle={handleToggle}>
      <Dropdown.Toggle 
        variant="link" 
        className="nav-link nav-icon position-relative p-0 mx-2 no-arrow"
        style={{ 
          background: 'none', 
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <div className="notification-bell position-relative">
          <Image 
            src="/assets/images/h-bell-icon-new.webp" 
            alt="Notifications" 
            width={24} 
            height={24}
            className="transition-all"
            style={{ filter: 'brightness(0.8)' }}
          />
          {loading ? (
            <Spinner 
              animation="border" 
              size="sm" 
              className="position-absolute top-0 end-0 bg-white rounded-circle"
              style={{ width: '12px', height: '12px', borderWidth: '2px' }}
            />
          ) : unreadCount > 0 ? (
            <Badge 
              bg="danger" 
              className="position-absolute top-0 end-0 badge-pulse"
              style={{ 
                fontSize: '0.7rem',
                padding: '0.25em 0.4em',
                minWidth: '1.2em',
                transform: 'translate(25%, -25%)'
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
        </div>
      </Dropdown.Toggle>

      <Dropdown.Menu 
        align="end" 
        className="notification-menu shadow-lg border-0"
        style={{ 
          minWidth: 380,
          maxWidth: 380,
          maxHeight: '70vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-3 py-3 bg-light border-bottom">
          <div className="d-flex align-items-center">
            <h6 className="mb-0 fw-bold text-dark">Notifications</h6>
            {unreadCount > 0 && (
              <Badge bg="primary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          {notifications && notifications.length > 0 && (
            <Button 
              size="sm" 
              variant="outline-primary" 
              onClick={markAllRead}
              className="px-2 py-1"
              style={{ fontSize: '0.75rem' }}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="notification-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {error && (
            <div className="alert alert-warning alert-dismissible fade show m-3" role="alert">
              <small>Error loading notifications: {error}</small>
              <button 
                type="button" 
                className="btn-close" 
                style={{ fontSize: '0.7rem' }}
                onClick={() => setError(null)}
              ></button>
            </div>
          )}

          {notifications === null ? (
            <div className="text-center py-4">
              <Spinner variant="primary" />
              <div className="mt-2 text-muted">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-muted mb-2">No notifications</div>
              <small className="text-muted">You're all caught up!</small>
            </div>
          ) : (
            notifications.map((n) => {
              const req = n.time_request_id ? requestsMap[n.time_request_id] : null;
              const task = n.task_id ? tasksMap[n.task_id] : null;

              const taskLink = task?.id ? `/tasksai/${task.id}` : (n.task_id ? `/tasksai/${n.task_id}` : null);
              const reqLink = req?.id ? `/time-requests/${req.id}` : (n.time_request_id ? `/time-requests/${n.time_request_id}` : null);

              return (
                <div 
                  key={n.id} 
                  className={`notification-item p-3 border-bottom ${!n.is_read ? 'bg-light-blue' : ''}`}
                  style={{ 
                    borderLeft: !n.is_read ? '4px solid #0d6efd' : '4px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center">
                      {!n.is_read && (
                        <span 
                          className="bg-primary rounded-circle me-2"
                          style={{ width: 8, height: 8 }}
                        ></span>
                      )}
                      <small className="text-muted">{formatTime(n.created_at)}</small>
                    </div>
                    {!n.is_read && (
                      <Badge bg="outline-primary" text="primary" style={{ fontSize: '0.65rem' }}>
                        New
                      </Badge>
                    )}
                  </div>

                  <p className="mb-2 text-dark" style={{ lineHeight: 1.4 }}>{n.verb}</p>

                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    {/* Time Request Actions */}
                    {req?.status === "PENDING" && !n.is_read && (
                      <>
                        <Button 
                          size="sm" 
                          variant="success" 
                          onClick={() => changeStatus(n, "APPROVED")}
                          className="px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          ✓ Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          onClick={() => changeStatus(n, "REJECTED")}
                          className="px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          ✗ Reject
                        </Button>
                      </>
                    )}

                    {/* Links */}
                    {reqLink && (
                      <Link href={reqLink} className="text-decoration-none">
                        <Button 
                          size="sm" 
                          variant="outline-primary"
                          className="px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          View Request
                        </Button>
                      </Link>
                    )}
                  
                    {/* Mark Read */}
                    {!n.is_read && (
                      <Button 
                        size="sm" 
                        variant="outline-dark" 
                        onClick={() => markRead(n.id)}
                        className="px-2 py-1 ms-auto"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <div className="border-top bg-light">
            <Link 
              href="/notifications" 
              className="d-block text-center py-2 text-decoration-none text-primary fw-medium"
              style={{ fontSize: '0.9rem' }}
            >
              View all notifications
            </Link>
          </div>
        )}
      </Dropdown.Menu>

      <style jsx>{`
        .notification-bell:hover {
          transform: scale(1.05);
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        .bg-light-blue {
          background-color: #f8f9fa;
        }
        .badge-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: translate(25%, -25%) scale(1); }
          50% { transform: translate(25%, -25%) scale(1.1); }
          100% { transform: translate(25%, -25%) scale(1); }
        }
        .notification-item:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>

      <style jsx global>{`
        /* Remove dropdown arrow */
        .notification-dropdown .dropdown-toggle::after {
          display: none !important;
        }
        .no-arrow::after {
          display: none !important;
        }
      `}</style>
    </Dropdown>
  );
}