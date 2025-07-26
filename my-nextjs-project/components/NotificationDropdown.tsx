// components/NotificationDropdown.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Spinner, Button } from "react-bootstrap";

interface Notification {
  id: number;
  time_request_id: number;
  verb: string;
  created_at: string;
  is_read: boolean;
}

interface TimeRequest {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp(`(^|;)\\s*${name}=\\s*([^;]+)`));
  return m ? m[2] : "";
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [requestsMap, setRequestsMap] = useState<Record<number, TimeRequest>>({});
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const csrftoken = getCookie("csrftoken");

  // 1) Load notifications
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(res.statusText);
        const data: Notification[] = await res.json();
        setNotifications(data);

        // Pre‑fetch the related time‑requests so we know their statuses
        const ids = Array.from(new Set(data.map((n) => n.time_request_id)));
        const reqs = await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE}/time-requests/${id}/`, {
              credentials: "include",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Token ${token}` } : {}) },
            }).then((r) => r.json())
          )
        );
        const m: Record<number, TimeRequest> = {};
        reqs.forEach((r: any) => { m[r.id] = r; });
        setRequestsMap(m);
      } catch (e) {
        console.error("Failed loading notifications", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) Approve/Reject handler
  const changeStatus = async (notif: Notification, newStatus: "APPROVED" | "REJECTED") => {
    try {
      await fetch(`${API_BASE}/time-requests/${notif.time_request_id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      // Mark notification read
      await fetch(`${API_BASE}/notifications/${notif.id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ is_read: true }),
      });
      // Refresh local state
      setNotifications((n) =>
        n.map((x) => (x.id === notif.id ? { ...x, is_read: true } : x))
      );
      // Update request status map too
      setRequestsMap((m) => ({
        ...m,
        [notif.time_request_id]: { ...m[notif.time_request_id], status: newStatus },
      }));
    } catch (e) {
      console.error("Status change failed", e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <li ref={dropdownRef} className="nav-item dropdown">
      <Link
        href="#"
        className="nav-link nav-icon"
        data-bs-toggle="dropdown"
      >
        <Image
          src="/assets/images/Notification.png"
          alt="Notifications"
          width={24}
          height={24}
        />
        {unreadCount > 0 && (
          <span className="badge bg-primary badge-number">
            {unreadCount}
          </span>
        )}
      </Link>

      <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow notifications">
        <li className="dropdown-header">
          You have {unreadCount} new notification
          {unreadCount !== 1 && "s"}
          <Link href="#">
            <span className="badge rounded-pill bg-primary p-2 ms-2">
              View all
            </span>
          </Link>
        </li>
        <li><hr className="dropdown-divider" /></li>

        {loading ? (
          <li className="text-center py-3"><Spinner animation="border" size="sm" /></li>
        ) : notifications.length === 0 ? (
          <li className="text-center py-3">No notifications</li>
        ) : notifications.map((n) => {
          const req = requestsMap[n.time_request_id];
          return (
            <li key={n.id} className="notification-item">
              <i className="bi bi-bell text-primary"></i>
              <div>
                <h4>{n.verb}</h4>
                <p>{new Date(n.created_at).toLocaleString()}</p>
                {/* If it’s a pending time-request, show Approve/Reject */}
                {req?.status === "PENDING" && !n.is_read && (
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => changeStatus(n, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => changeStatus(n, "REJECTED")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
              <li><hr className="dropdown-divider" /></li>
            </li>
          );
        })}
        <li className="dropdown-footer">
          <Link href="#">
            Show all notifications
          </Link>
        </li>
      </ul>
    </li>
  );
}
