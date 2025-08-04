// components/NotificationDropdown.tsx
"use client";

import React, { useState, useRef } from "react";
import { Dropdown, Spinner, Button } from "react-bootstrap";
import Link from "next/link";
import Image from "next/image";

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
  const [notifications, setNotifications] = useState<Notification[]|null>(null);
  const [requestsMap, setRequestsMap] = useState<Record<number, TimeRequest>>({});
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const csrftoken = getCookie("csrftoken");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
      });
      const data: Notification[] = await res.json();
      setNotifications(data);

      // fetch related time-requests statuses
      const ids = [...new Set(data.map(n => n.time_request_id))];
      const reqs = await Promise.all(
        ids.map((id) =>
          fetch(`${API_BASE}/time-requests/${id}/`, {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Token ${token}` } : {}),
            },
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
  };

  const handleToggle = (isOpen: boolean) => {
    // on first open, fetch
    if (isOpen && notifications === null) {
      fetchNotifications();
    }
  };

  const changeStatus = async (notif: Notification, newStatus: "APPROVED"|"REJECTED") => {
    await fetch(`${API_BASE}/time-requests/${notif.time_request_id}/`, {
      method: "PATCH", credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetch(`${API_BASE}/notifications/${notif.id}/`, {
      method: "PATCH", credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      body: JSON.stringify({ is_read: true }),
    });
    // update locally
    setNotifications((ns) => ns?.map(n => n.id === notif.id ? { ...n, is_read: true } : n) || null);
    setRequestsMap((m) => ({ ...m, [notif.time_request_id]: { ...m[notif.time_request_id], status: newStatus } }));
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0;

  return (
    <Dropdown className="h-notify-bell" onToggle={handleToggle} ref={dropdownRef}>
      <Dropdown.Toggle variant="link" className="nav-link nav-icon position-relative ">
        <Image src="/assets/images/h-bell-icon-new.png" alt="Notifications" width={18} height={18}/>
        {loading ? (
          <Spinner animation="border" size="sm" className="position-absolute top-0 end-0" />
        ) : unreadCount > 0 ? (
          <span className="badge bg-primary badge-number">{unreadCount}</span>
        ) : null}
      </Dropdown.Toggle>

      <Dropdown.Menu align="end" className="notifications">
        <Dropdown.Header>
          {unreadCount
            ? `You have ${unreadCount} new notification${unreadCount>1?'s':''}`
            : "No new notifications"}
        </Dropdown.Header>
        <Dropdown.Divider />

        {notifications === null ? (
          <div className="text-center py-2"><Spinner /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-2">All caught up!</div>
        ) : notifications.map(n => {
          const req = requestsMap[n.time_request_id];
          return (
            <React.Fragment key={n.id}>
              <div className="notification-item d-flex flex-column p-2">
                <small className="text-muted">{new Date(n.created_at).toLocaleString()}</small>
                <p className="mb-1">{n.verb}</p>
                {req?.status === "PENDING" && !n.is_read && (
                  <div>
                    <Button size="sm" onClick={() => changeStatus(n, "APPROVED")}>
                      Approve
                    </Button>{" "}
                    <Button size="sm" variant="danger" onClick={() => changeStatus(n, "REJECTED")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
              <Dropdown.Divider />
            </React.Fragment>
          );
        })}

        {notifications && notifications.length > 0 && (
          <Dropdown.Item as="div" className="text-center">
            <Link href="/notifications">View all</Link>
          </Dropdown.Item>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
