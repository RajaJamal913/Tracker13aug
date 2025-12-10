// usr-mgt-layout 

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
// build add 
interface DashboardLayoutProps {
  children: React.ReactNode;
}
// build add 

// build change 
// export default function DashboardLayout({ children }) {
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [username, setUsername] = useState("Loading...");

  const router = useRouter();
  // On mount, load the current user’s name
  useEffect(() => {


    // Option B: Fetch from the backend
    fetch("http://127.0.0.1:8000/api/auth/whoami/", {
      headers: {
        "Authorization": `Token ${localStorage.getItem("token")}`
      }
    })
      .then(res => res.json())
      .then(data => setUsername(data.username))
      .catch(() => setUsername("Unknown User"));
  }, []);

  const handleLogout = () => {
    // Remove auth token & any user info
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    // Redirect to login
    router.push("/user-login");
  };


  // Redirect if base path is visited
  useEffect(() => {
    if (pathname === '/dashboard/user-management') {
      router.replace('/dashboard/user-management/profile-settings');
    }
  }, [pathname, router]);

  const navLinks = [
    { label: 'Profile Settings', href: '/dashboard/user-management/profile-settings' },
    { label: 'Workspace', href: '/dashboard/user-management/accounts' },
    { label: 'Time Tracker', href: '/dashboard/user-management/time-tracker' },
    { label: 'Timesheet', href: '/dashboard/user-management/time-sheets' },
    { label: 'Attendance', href: '/dashboard/user-management/attendance' },
    { label: 'Break', href: '/dashboard/user-management/break' },
    { label: 'Leave', href: '/dashboard/user-management/leave' },
    { label: 'Screenshot', href: '/dashboard/user-management/screenshot' },
    // { label: 'Task', href: '/user-management/task' },
    // { label: 'Activity Level', href: '/user-management/activity-level' },
  ];

  return (
    <>
      <div className="um-main-wrapper pb-5">

        <div className="d-flex justify-content-end pe-3 um-canvas-toggle-wrapper mb-3">
          <a className="um-canvas-toggle" data-bs-toggle="offcanvas" href="#offcanvasExample" role="button" aria-controls="offcanvasExample">
           <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg" style={{ width: "20px;",
    height: "25px;",
    fill: "grey;"}}><path d="M32 96v64h448V96H32zm0 128v64h448v-64H32zm0 128v64h448v-64H32z"></path></svg>
          </a>
        </div>
        <div className="dashboard-container">
          <aside className="sidebar user-mgt-dashboard g-scroll">
            <div className="mb-3 border-bottom pb-1">
              <h3 className="logo text-dark text-xl font-semibold mb-1">
                {username}
              </h3>
              <span className=''>Member Since 2025</span>
            </div>
            <nav>
              {navLinks.map((link, index) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={index}
                    className={`py-2 d-block px-2 text-decoration-none rounded ${isActive ? 'active-link' : 'text-dark'
                      }`}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="offcanvas offcanvas-start um-off-canvas" data-bs-backdrop="static" tabIndex={-1} id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
            <div className="offcanvas-header">
              <h5 className="offcanvas-title d-none" id="offcanvasExampleLabel">Offcanvas</h5>
              <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div className="offcanvas-body g-scroll">
              <aside className="off-canvas-aside ">
                <div className="mb-3 border-bottom pb-1">
                  <h3 className="logo text-dark text-xl font-semibold mb-1">
                    {username}
                  </h3>
                  <span className=''>Member Since 2025</span>
                </div>
                <nav>
                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={index}
                        className={`py-2 d-block px-2 text-decoration-none rounded ${isActive ? 'active-link' : 'text-dark'
                          }`}
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </div>
          </div>
          <main className="content-area bg-white py-0 overflow-x-hidden px-0 px-lg-3">{children}</main>
          <style jsx>{`
        .dashboard-container {
          display: flex;
          height: 100vh;
        }
        .sidebar {
          width: 240px;
          background-color: #f1f1f1;
          padding: 20px;
          border-right: 1px solid #ccc;
        }
        .sidebar nav a {
          margin: 6px 0;
        }
        .active-link {
          background-color: #8e44ec;
          color: #fff !important;
          font-weight: bold;
        }
        .content-area {
          flex-grow: 1;
          padding: 20px;
          background: #f5f6fa;
        }
  .user-mgt-dashboard .active-link {
    background: #8e44ec;
    color: white;
    font-weight: 500;
}
    .user-mgt-dashboard nav a:hover {
    background: #8e44ec;
    color: white !important;
    font-weight: 500;
}
    .content-main {
    height: calc(100vh - 110px) !important;
    overflow: hidden auto;
}
      `}</style>
        </div>
      </div>
    </>

  );
}
