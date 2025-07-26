
// components/Header.tsx
"use client";

import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import NotificationDropdown from "@/components/NotificationDropdown";

export default function Header() {
  const [username, setUsername] = useState<string>("Loading...");
  const router = useRouter();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/auth/whoami/", {
      headers: { Authorization: `Token ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => setUsername(data.username))
      .catch(() => setUsername("Unknown User"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/user-login");
  };

  return (
    <header id="header" className="header d-flex align-items-center p-3">
      {/* Logo/Sidebar toggle could go here */}

      <nav className="header-nav ms-auto">
        <ul className="d-flex align-items-center list-unstyled m-0">

          {/* Notification Bell (dynamic) */}
          <NotificationDropdown />

          {/* Messages Dropdown (static placeholder) */}
          <li className="nav-item dropdown ms-3">
            <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
              <Image src="/assets/images/h-chat.png" alt="Messages" width={24} height={24} />
              <span className="badge bg-success badge-number">3</span>
            </Link>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
              <li className="dropdown-header">
                You have 3 new messages
                <Link href="#">
                  <span className="badge rounded-pill bg-primary ms-2 p-2">View all</span>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              {/* TODO: map message items here */}
              <li className="dropdown-footer">
                <Link href="#">Show all messages</Link>
              </li>
            </ul>
          </li>

          {/* Profile Dropdown */}
          <li className="nav-item dropdown ms-3">
            <Link
              href="#"
              className="nav-link nav-profile d-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <Image
                src="/assets/images/profile-img.jpg"
                alt="Profile"
                width={32}
                height={32}
                className="rounded-circle"
              />
              <span className="ms-2">{username}</span>
            </Link>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow profile">
              <li className="dropdown-header">
                <h6>{username}</h6>
                <span>Member</span>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link href="/profile" className="dropdown-item d-flex align-items-center">
                  <i className="bi bi-person me-2"></i>
                  <span>My Profile</span>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  onClick={handleLogout}
                  className="dropdown-item d-flex align-items-center bg-transparent border-0"
                >
                  <i className="bi bi-box-arrow-right me-2"></i>
                  <span>Sign Out</span>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </header>
  );
}

