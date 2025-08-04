// components/Header.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BreakButton from "@/components/trackerbtn";
import NotificationDropdown from "@/components/NotificationDropdown";
// wherever your file lives, adjust the path accordingly
import StartTracker from '@/components/StartTracker';

// import React, { useRef } from "react";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { Ripple } from "primereact/ripple";


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
 const menu = useRef<Menu>(null);

  const items = [
    {
      label: "Profile",
      icon: "pi pi-user",
      command: () => alert("Go to Profile"),
    },
    {
      label: "Settings",
      icon: "pi pi-cog",
      command: () => alert("Open Settings"),
    },
    {
      label: "Notifications",
      icon: "pi pi-bell",
      command: () => alert("Show Notifications"),
    },
    { separator: true },
    {
      label: "Logout",
      icon: "pi pi-sign-out",
      command: () => alert("Logged out!"),
    },
  ];
  return (
    <header id="header" className="header d-flex align-items-center">
      <div className="header-inner">
        {/* Logo/Sidebar toggle could go here */}
        <div className="welcome-wrapper-main d-flex align-items-center gap-2">
            <StartTracker />
          <div className="d-flex align-items-center gap-2 d-none">
            <div className="header-welcome-wrapper">
              <Image
                src="/assets/images/header-user-icon.png"
                alt="User Icon"
                width={18}
                height={18}
              />
            </div>

            <div className="designation-wrapper d-flex align-items-center gap-2">
              <span className="user-name">{username}</span>
            
            </div>
          </div>
        </div>

        <nav className="header-nav ms-auto">
          <ul className="d-flex align-items-center list-unstyled m-0">
            {/* Notification Bell (dynamic) */}
            <NotificationDropdown />

            {/* Messages Dropdown (static placeholder) */}
            <li className="nav-item dropdown ms-3">
              <Link
                href="#"
                className="nav-link nav-icon h-chat-wrap"
                data-bs-toggle="dropdown"
              >
                <Image
                  src="/assets/images/h-chat-icon-new.png"
                  alt="Messages"
                  width={18}
                  height={18}
                />
                <span className="badge bg-success badge-number">3</span>
              </Link>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
                <li className="dropdown-header">
                  You have 3 new messages
                  <Link href="#">
                    <span className="badge rounded-pill bg-primary ms-2 p-2">
                      View all
                    </span>
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {/* TODO: map message items here */}
                <li className="dropdown-footer">
                  <Link href="#">Show all messages</Link>
                </li>
              </ul>
            </li>

            {/* Profile Dropdown */}
            <li>
              
            </li>
            <li className="nav-item dropdown ms-3">
              {/* <Link
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
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <Link
                    href="/profile"
                    className="dropdown-item d-flex align-items-center"
                  >
                    <i className="bi bi-person me-2"></i>
                    <span>My Profile</span>
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="dropdown-item d-flex align-items-center bg-transparent border-0"
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    <span>Sign Out</span>
                  </button>
                </li>
                <li>
           
                </li>
              </ul> */}
                 <div className="nav-profile-wrapper">
      <Menu model={items} popup ref={menu} />

      {/* Avatar + Name Trigger */}
      <div
        onClick={(event) => menu.current?.toggle(event)}
        className="flex align-items-center gap-2 cursor-pointer nav-profile"
      >
        <Avatar
          image="/assets/images/profile-img.jpg" // Replace with actual user image
          size="large"
          shape="circle"
        />
        <span className="font-medium text-900">Ammad</span>
        <i className="pi pi-angle-down text-600 text-sm"></i>
        <Ripple />
      </div>
    </div>
            </li>
          </ul>
        </nav>
      </div>
      <style jsx>
{
  `
  .p-menu .p-menuitem:not(.p-highlight):not(.p-disabled).p-focus > .p-menuitem-content {
    color: #4b5563;
   
    background: linear-gradient(90deg, rgba(176, 122, 243, 0.27) 0%, rgba(208, 248, 254, 0.40) 46.15%, rgba(176, 122, 243, 0.28) 69.23%, rgba(208, 248, 254, 0.40) 100%) !important;
}
   .p-menu.p-menu-overlay .p-menu-list {
    padding: 0px;
}
        .p-menu.p-menu-overlay .p-menu-list a{
    text-decoration:none;
}
  `
}
      </style>
    </header>
  );
}
