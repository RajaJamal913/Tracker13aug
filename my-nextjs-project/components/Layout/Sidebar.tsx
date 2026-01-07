"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaClock, FaChartBar, FaUsers, FaTasks, FaTools, FaSignInAlt, FaChevronDown, FaProjectDiagram,
  FaCalendarAlt,
  FaComments,
  FaPlug,
  FaEye,
  FaFile,
  FaFileAlt,
  FaChartPie,
  FaClipboardList,
  FaStream,
  FaGlobe,
  FaIdBadge,
  FaUsersCog,
  FaUser,
  FaTachometerAlt,
  FaCamera,
  FaChartLine,
  FaRegCalendarAlt,
  FaCalendarCheck,
  FaBalanceScale,
  FaSuitcaseRolling,
  FaUmbrellaBeach,
  FaArchive,
  FaFileContract,
  FaLayerGroup,
  FaFolderOpen,
  FaCommentAlt,
  FaEdit,
  FaRegClock,
} from "react-icons/fa";
import { VscGithubProject } from "react-icons/vsc";
import { CiViewTimeline } from "react-icons/ci";
import { MdCoPresent } from "react-icons/md";
import { FaUserCog } from "react-icons/fa";
import { Si2Fas } from "react-icons/si";
import { MdDashboard } from "react-icons/md";

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ collapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sidebarSwitchIcon = document.querySelector(".sidebar_switch_icon");

    const handleClick = () => {
      const sidebarCol = document.querySelector(".sidebar-col");
      const contentCol = document.querySelector(".content-col");
      const mainInnerRow = document.querySelector(".main-inner-row");

      if (sidebarCol) {
        sidebarCol.classList.toggle("col-lg-2");
        sidebarCol.classList.toggle("col-md-12");
      }

      if (contentCol) {
        contentCol.classList.toggle("col-lg-10");
        contentCol.classList.toggle("col-md-0");
      }

      if (mainInnerRow) {
        mainInnerRow.classList.toggle("small_sidebar_partner");
      }
    };

    if (sidebarSwitchIcon) {
      sidebarSwitchIcon.addEventListener("click", handleClick);
    }

    // Cleanup on unmount
    return () => {
      if (sidebarSwitchIcon) {
        sidebarSwitchIcon.removeEventListener("click", handleClick);
      }
    };
  }, []);

  // Function to check if a link is active - FIXED
  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      // For dashboard, only mark as active if it's exactly /dashboard
      return pathname === "/dashboard";
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  // Function to check if a dropdown should be open based on active child
  const isDropdownOpen = (menuKey: string, dropdownLinks: string[]) => {
    return dropdownLinks.some(link => isLinkActive(link));
  };

  // Initialize open menus based on current path
  useEffect(() => {
    // Define dropdown menu items and their associated paths
    const dropdownConfig: Record<string, string[]> = {
      reports: [
        "/dashboard/tracked-hours",
        "/dashboard/timeline",
        "/dashboard/attendance",
        "/dashboard/activity-level"
      ],
      timesheets: [
        "/dashboard/timesheet/view&edit-timesheet",
        "/dashboard/timesheet/timerequest",
        "/dashboard/timesheet/timeeditors"
      ],
      statistics: [
        "/dashboard/reports/statistics/activity-description",
        "/dashboard/reports/statistics/apps-websites",
        "/dashboard/reports/statistics/tasks",
        "/dashboard/reports/statistics/all-reports"
      ],
      people: [
        "/dashboard/members-new",
        "/dashboard/people/teams",
        "/dashboard/people/titles",
        "/dashboard/people/project-viewers"
      ],
      timeOff: [
        "/dashboard/time-off/holidays",
        "/dashboard/time-off/leaves",
        "/dashboard/time-off/leave-balance",
        "/dashboard/time-off/request",
        "/dashboard/time-off/calendar"
      ],
      monitoring: [
        "/dashboard/2fa",
        "/dashboard/monitoring/daily-activity",
        "/dashboard/monitoring/productivity"
      ],
      projects: [
        "/dashboard/projects/active",
        "/dashboard/projects/group",
        "/dashboard/projects/contracts",
        "/dashboard/projects/archive"
      ],
      communication: [
        "/dashboard/communication/chat"
      ]
    };

    // Check each dropdown and open if any child is active
    const newOpenMenus: Record<string, boolean> = {};
    Object.keys(dropdownConfig).forEach(menu => {
      newOpenMenus[menu] = isDropdownOpen(menu, dropdownConfig[menu]);
    });
    
    setOpenMenus(newOpenMenus);
  }, [pathname]);

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !(prev?.[menu] || false) }));
  };

  // Function to get active class for links
  const getActiveClass = (href: string) => {
    return isLinkActive(href) ? "active" : "";
  };

  // Function to get active class for dropdown parents
  const getDropdownActiveClass = (menuKey: string, dropdownLinks: string[]) => {
    return isDropdownOpen(menuKey, dropdownLinks) ? "active-dropdown" : "";
  };

  return (
    <aside className="g-scroll text-white px-3 position-relative d-flex flex-column gap-0">
      <button className="sidebar_switch_icon">
        {/*  */}
      </button>
      
      {/* Add close button inside sidebar */}
      <div className="sidebar-header">
        <button
          onClick={toggleSidebar}
          className="sidebar-close-btn"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '10px'
          }}
        >
          <svg stroke="currentColor" fill="none" strokeWidth="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M16.3956 7.75734C16.7862 8.14786 16.7862 8.78103 16.3956 9.17155L13.4142 12.153L16.0896 14.8284C16.4802 15.2189 16.4802 15.8521 16.0896 16.2426C15.6991 16.6331 15.0659 16.6331 14.6754 16.2426L12 13.5672L9.32458 16.2426C8.93405 16.6331 8.30089 16.6331 7.91036 16.2426C7.51984 15.8521 7.51984 15.2189 7.91036 14.8284L10.5858 12.153L7.60436 9.17155C7.21383 8.78103 7.21383 8.14786 7.60436 7.75734C7.99488 7.36681 8.62805 7.36681 9.01857 7.75734L12 10.7388L14.9814 7.75734C15.372 7.36681 16.0051 7.36681 16.3956 7.75734Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M4 1C2.34315 1 1 2.34315 1 4V20C1 21.6569 2.34315 23 4 23H20C21.6569 23 23 21.6569 23 20V4C23 2.34315 21.6569 1 20 1H4ZM20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3Z" fill="currentColor"></path></svg>
        </button>
      </div>
      
      <div className="py-3 border-bottom sidebar-logo-wrapper">
        <Link href="/dashboard" className="logo d-flex align-items-center">
         <img src="/assets/images/new/new-trk-logo.png" alt="" />
        </Link>
      </div>
      
      <div className="nav-wrapper">
        <nav className="g-scroll mt-1 pe-1">
          <ul className="space-y-2 p-0">
            <li>
              <small className="fw-medium mb-4 ps-2" style={{ color: "#7A8A9F" }}>WORKSPACE</small>
            </li>
            
            {/* Dashboard Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard")}`}>
              <Link href="/dashboard">
                <MdDashboard /><span>Dashboard</span>
              </Link>
            </li>
            
            {/* Projects Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/Projects/Createproject")}`}>
              <Link href="/dashboard/Projects/Createproject">
                <VscGithubProject />
                <span>Projects</span>
              </Link>
            </li>
            
            {/* MyTask Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/MyTask")}`}>
              <Link href="/dashboard/MyTask">
                <FaTasks />
                <span>Tasks</span>
              </Link>
            </li>
            
            {/* Time Request Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/timesheet/view&edit-timesheet")}`}>
              <Link href="/dashboard/timesheet/view&edit-timesheet">
                <FaClock />
                <span>Time Request</span>
              </Link>
            </li>
            
           
            

            {/* Reports Dropdown */}
            <li className={`nav-link p-2 d-flex align-items-center gap-2 transition-all ${getDropdownActiveClass("reports", [
              "/dashboard/tracked-hours",
              "/dashboard/timeline",
              "/dashboard/attendance",
              "/dashboard/activity-level"
            ])}`}>
              <FaChartBar />
              <button
                onClick={() => toggleMenu("reports")}
                className="flex-1 text-left hover:text-blue d-flex justify-content-between align-items-center w-100"
              >
                <div className="d-flex justify-content-between align-items-center w-100 s-s-b">
                  <span>Reporting Feature</span>
                </div>
                <FaChevronDown
                  className={`transition-transform ${openMenus["reports"] ? "rotate-180" : ""}`}
                />
              </button>
            </li>
            {openMenus["reports"] && (
              <ul className="pl-4 space-y-3">
                <li className={`p-2 d-flex align-items-center gap-2 transition-all nav-link ${getActiveClass("/dashboard/tracked-hours")}`}>
                  <Link href="/dashboard/tracked-hours" className="d-flex align-items-center gap-2">
                    <FaClock />
                    <span>Tracked Hours</span>
                  </Link>
                </li>
                <li className={`p-2 d-flex align-items-center gap-2 transition-all nav-link ${getActiveClass("/dashboard/timeline")}`}>
                  <Link href="/dashboard/timeline" className="d-flex align-items-center gap-2">
                    <FaStream />
                    <span>Timeline</span>
                  </Link>
                </li>
                <li className={`p-2 d-flex align-items-center gap-2 transition-all nav-link ${getActiveClass("/dashboard/attendance")}`}>
                  <Link href="/dashboard/attendance" className="d-flex align-items-center gap-2">
                    <FaClipboardList />
                    <span>Attendance</span>
                  </Link>
                </li>
                <li className={`p-2 d-flex align-items-center gap-2 transition-all nav-link ${getActiveClass("/dashboard/activity-level")}`}>
                  <Link href="/dashboard/activity-level" className="d-flex align-items-center gap-2">
                    <FaChartBar />
                    <span>Activity Level</span>
                  </Link>
                </li>
              </ul>
            )}

       
            {/* Statistics Dropdown */}
            <li className={`hover:bg-white hover:text-black p-2 d-flex justify-content-between align-items-center gap-2 transition-all d-none ${getDropdownActiveClass("statistics", [
              "/dashboard/reports/statistics/activity-description",
              "/dashboard/reports/statistics/apps-websites",
              "/dashboard/reports/statistics/tasks",
              "/dashboard/reports/statistics/all-reports"
            ])}`}>
              <button
                onClick={() => toggleMenu("statistics")}
                className="flex items-center gap-2 hover:bg-white hover:text-black transition-all d-flex justify-content-between align-items-center w-100"
              >
                <FaChartPie />
                <div className="d-flex justify-content-between align-items-center w-100 s-s-b">
                  <span>Statistics</span>
                  <FaChevronDown
                    className={`transition-transform ${openMenus["statistics"] ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
            </li>
            
            {openMenus["statistics"] && (
              <ul className="pl-6 space-y-2">
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/reports/statistics/activity-description")}`}>
                  <Link href="/dashboard/reports/statistics/activity-description" className="d-flex items-center gap-2">
                    <FaFileAlt />
                    <span>Activity Description</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/reports/statistics/apps-websites")}`}>
                  <Link href="/dashboard/reports/statistics/apps-websites" className="d-flex items-center gap-2">
                    <FaGlobe />
                    <span>Apps & Websites</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/reports/statistics/tasks")}`}>
                  <Link href="/dashboard/reports/statistics/tasks" className="d-flex items-center gap-2">
                    <FaTasks />
                    <span>Tasks</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/reports/statistics/all-reports")}`}>
                  <Link href="/dashboard/reports/statistics/all-reports" className="d-flex items-center gap-2">
                    <FaFile />
                    <span>All Reports</span>
                  </Link>
                </li>
              </ul>
            )}

          

          
            <li>
              <div className="divider my-3"></div>
            </li>
            
            <li>
              <small className="fw-medium mb-4 ps-2" style={{ color: "#7A8A9F" }}>PEOPLE</small>
            </li>

            {/* Realtime Monitoring Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/member-monitoring")}`}>
              <a href="/dashboard/member-monitoring">
                <FaEye />
                <span>Realtime Monitoring</span>
              </a>
            </li>
            
            {/* Member Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/members-new/add-members")}`}>
              <Link href="/dashboard/members-new/add-members">
                <FaUser />
                <span>Member</span>
              </Link>
            </li>
            
            {/* Teams Link */}
            <li className={`nav-link p-2 ${getActiveClass("/dashboard/Teams2/add-teams")}`}>
              <Link href="/dashboard/Teams2/add-teams">
                <FaUsersCog />
                <span>Teams</span>
              </Link>
            </li>

            <li className="nav-link d-none">
              <Link href="/dashboard/tasks">
                <FaTasks />
                <span>Tasks</span>
              </Link>
            </li>

            <li className="nav-link d-none">
              <Link href="/dashboard/tools">
                <FaTools />
                <span>Tools</span>
              </Link>
            </li>

            {/* Time Off Dropdown */}
            <li className={`d-none ${getDropdownActiveClass("timeOff", [
              "/dashboard/time-off/holidays",
              "/dashboard/time-off/leaves",
              "/dashboard/time-off/leave-balance",
              "/dashboard/time-off/request",
              "/dashboard/time-off/calendar"
            ])}`}>
              <button onClick={() => toggleMenu("timeOff")} className="d-flex justify-content-between align-items-center w-100">
                <FaCalendarAlt />
                <div className="d-flex justify-content-between align-items-center w-100 s-s-b">
                  <span>Time Off</span>
                  <FaChevronDown
                    className={`transition-transform ${openMenus["timeOff"] ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
            </li>

            {openMenus["timeOff"] && (
              <ul className="pl-6 space-y-2">
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/time-off/holidays")}`}>
                  <Link href="/dashboard/time-off/holidays" className="d-flex items-center gap-2">
                    <FaUmbrellaBeach />
                    <span>Holidays</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/time-off/leaves")}`}>
                  <Link href="/dashboard/time-off/leaves" className="d-flex items-center gap-2">
                    <FaSuitcaseRolling />
                    <span>Leaves</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/time-off/leave-balance")}`}>
                  <Link href="/dashboard/time-off/leave-balance" className="d-flex items-center gap-2">
                    <FaBalanceScale />
                    <span>Leave Balance</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/time-off/request")}`}>
                  <Link href="/dashboard/time-off/request" className="d-flex items-center gap-2">
                    <FaCalendarCheck />
                    <span>Request Time Off</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/time-off/calendar")}`}>
                  <Link href="/dashboard/time-off/calendar" className="d-flex items-center gap-2">
                    <FaRegCalendarAlt />
                    <span>Calendar</span>
                  </Link>
                </li>
              </ul>
            )}
            
            <li>
              <div className="divider my-3"></div>
            </li>
            
            <li>
              <small className="fw-medium mb-4 ps-2" style={{ color: "#7A8A9F" }}>SECURITY</small>
            </li>

            {/* Security Dropdown */}
            <li className={`nav-link p-2 d-flex align-items-center gap-2 transition-all ${getDropdownActiveClass("monitoring", [
              "/dashboard/2fa",
              "/dashboard/monitoring/daily-activity",
              "/dashboard/monitoring/productivity"
            ])}`} style={{ color: "#4a5569" }}>
              <FaEye />
              <button onClick={() => toggleMenu("monitoring")} className="flex-1 text-left text-blue d-flex justify-content-between align-items-center w-100" style={{ fontSize: "13px" }}>
                <span>Security Feature</span>
                <FaChevronDown
                  className={`transition-transform ${openMenus["monitoring"] ? "rotate-180" : ""}`}
                />
              </button>
            </li>

            {openMenus["monitoring"] && (
              <ul className="pl-6 space-y-2">
                <li className={`p-2 d-flex align-items-center gap-2 transition-all nav-link ${getActiveClass("/dashboard/2fa")}`}>
                  <Link href="/dashboard/2fa" className="d-flex align-items-center gap-2">
                    <Si2Fas />
                    <span>2 Factor Authentication</span>
                  </Link>
                </li>
              </ul>
            )}

       
         

            {/* Projects Dropdown */}
            <li className={`d-none hover:bg-white hover:text-black p-2 flex items-center gap-2 transition-all ${getDropdownActiveClass("projects", [
              "/dashboard/projects/active",
              "/dashboard/projects/group",
              "/dashboard/projects/contracts",
              "/dashboard/projects/archive"
            ])}`}>
              <FaProjectDiagram />
              <button onClick={() => toggleMenu("projects")} className="flex-1 text-left text-blue d-flex justify-content-between align-items-center w-100">
                <span>Projects</span>
                <FaChevronDown
                  className={`transition-transform ${openMenus["projects"] ? "rotate-180" : ""}`}
                />
              </button>
            </li>

            {openMenus["projects"] && (
              <ul className="pl-6 space-y-2">
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/projects/active")}`}>
                  <Link href="/dashboard/projects/active" className="d-flex items-center gap-2">
                    <FaFolderOpen />
                    <span>Active Projects</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/projects/group")}`}>
                  <Link href="/dashboard/projects/group" className="d-flex items-center gap-2">
                    <FaLayerGroup />
                    <span>Projects Group</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/projects/contracts")}`}>
                  <Link href="/dashboard/projects/contracts" className="d-flex items-center gap-2">
                    <FaFileContract />
                    <span>Contracts</span>
                  </Link>
                </li>
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/projects/archive")}`}>
                  <Link href="/dashboard/projects/archive" className="d-flex items-center gap-2">
                    <FaArchive />
                    <span>Archive</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* Communication Dropdown */}
            <li className={`hover:bg-white hover:text-black p-2 flex items-center gap-2 transition-all d-none ${getDropdownActiveClass("communication", [
              "/dashboard/communication/chat"
            ])}`}>
              <FaCommentAlt />
              <button
                onClick={() => toggleMenu("communication")}
                className="flex-1 text-left d-flex justify-content-between align-items-center w-100"
              >
                <span>Communication</span>
                <FaChevronDown
                  className={`transition-transform ${openMenus["communication"] ? "rotate-180" : ""}`}
                />
              </button>
            </li>
            
            {openMenus["communication"] && (
              <ul className="pl-6 space-y-1">
                <li className={`flex items-center gap-2 p-2 hover:bg-white hover:text-black transition-all nav-link ${getActiveClass("/dashboard/communication/chat")}`}>
                  <Link href="/dashboard/communication/chat" className="d-flex items-center gap-2">
                    <FaComments />
                    <span>Chat</span>
                  </Link>
                </li>
              </ul>
            )}
            
            <li className="hover:bg-white hover:text-black p-2 flex items-center gap-2 transition-all d-none">
              <FaStream /> <Link href="/tools">Integeration</Link>
            </li>

            <li className={`hover:bg-white hover:text-black p-2 flex items-center gap-2 transition-all ${getActiveClass("/logout")}`}>
              <FaSignInAlt /> <Link href="/logout">Logout</Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}