"use client";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
// import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faMessage } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


export default function Header() {
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


  return (
    <header id="header" className="header d-flex align-items-center">

      {/* <div className="d-flex align-items-center justify-content-between">
        <Link href="/" className="logo d-flex align-items-center">
          <span className="d-none d-lg-block">WEBWIZ </span>
        </Link>
        <i className="bi bi-list toggle-sidebar-btn"></i>
      </div> */}

      <div className="search-bar header-page-title-wrap d-flex align-items-center gap-2 d-none">
        <div className="header-icon-wrap">

          <Image src="/assets/images/dashboard-icon.png" alt="" width={50} height={50} style={{ width: "auto", height: "22px" }} className="" />
        </div>
        <h3 className="page-title mb-0">Dashboards</h3>
      </div>

      <nav className="header-nav ms-auto d-none">
        <ul className="d-flex align-items-center">
          <li className="nav-item d-block d-lg-none">
            <Link href="#" className="nav-link nav-icon search-bar-toggle">
              <i className="bi bi-search"></i>
            </Link>
          </li>

          {/* Notifications Dropdown */}
          <li className="nav-item dropdown">
            <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
              <Image src="/assets/images/Notification.png" alt="" width={50} height={50} className="h-icons" />   <span className="badge bg-primary badge-number">4</span>
            </Link>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow notifications">
              <li className="dropdown-header">
                You have 4 new notifications
                <Link href="#">
                  <span className="badge rounded-pill bg-primary p-2 ms-2">View all</span>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="notification-item">
                <i className="bi bi-exclamation-circle text-warning"></i>
                <div>
                  <h4>Lorem Ipsum</h4>
                  <p>Quae dolorem earum veritatis oditseno</p>
                  <p>30 min. ago</p>
                </div>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="dropdown-footer">
                <Link href="#">Show all notifications</Link>
              </li>
            </ul>
          </li>

          {/* Messages Dropdown */}
          <li className="nav-item dropdown">
            <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
              <Image src="/assets/images/h-chat.png" alt="" width={50} height={50} className="h-icons" />
              <span className="badge bg-success badge-number">3</span>
            </Link>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
              <li className="dropdown-header">
                You have 3 new messages
                <Link href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></Link>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="message-item">a
                <Link href="#">
                  <Image src="/assets/projectmanager/img/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
                  <div>
                    <h4>Maria Hudson</h4>
                    <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                    <p>4 hrs. ago</p>
                  </div>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="dropdown-footer">
                <Link href="#">Show all messages</Link>
              </li>
            </ul>
          </li>

          <li className="nav-item dropdown">
            {/* <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
              <Image src="/assets/images/Settings.png" alt="" width={50} height={50} className="h-icons" />

            </Link> */}
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
              <li className="dropdown-header">
                You have 3 new messages
                <Link href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></Link>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="message-item">
                <Link href="#">
                  <Image src="/assets/projectmanager/img/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
                  <div>
                    <h4>Maria Hudson</h4>
                    <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                    <p>4 hrs. ago</p>
                  </div>
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>

              <li className="dropdown-footer">
                <Link href="#">Show all messages</Link>
              </li>
            </ul>
          </li>

          {/* Profile Dropdown */}
          <li className="nav-item dropdown pe-3">
            <Link href="#" className="nav-link nav-profile d-flex align-items-center pe-0" data-bs-toggle="dropdown">
              <Image src="/assets/images/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
              <span className="d-none d-md-block dropdown-toggle ps-2">
                {username}
              </span>
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
                  <i className="bi bi-person"></i>
                  <span>My Profile</span>
                </Link>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <Link
                  href=""
                  className="dropdown-item d-flex align-items-center"
                >
                  <i className="bi bi-person"></i>
                  <span>Settings</span>
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
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Sign Out</span>
                </button>
              </li>
            </ul>


          </li>
        </ul>
      </nav>
      <nav className="navbar navbar-expand-lg w-100 overflow-hidden">
        <div className="container-fluid">
          <div className="search-bar header-page-title-wrap d-flex align-items-center gap-2">
            <div className="header-icon-wrap">

              <Image src="/assets/images/dashboard-icon.png" alt="" width={50} height={50} style={{ width: "auto", height: "22px" }} className="" />
            </div>
            <h3 className="page-title mb-0">Dashboards</h3>
          </div>
          <button className="navbar-toggler me-3" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse justify-content-end" id="navbarSupportedContent">
            <ul className="navbar-nav mb-2 mb-lg-0 align-items-center">
              {/* Notifications Dropdown */}
              <li className="nav-item dropdown position-relative">
                <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
                  <Image src="/assets/images/Notification.png" alt="" width={50} height={50} className="h-icons" />   <span className="badge bg-primary badge-number notify-count">4</span>
                </Link>
                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow notifications">
                  <li className="dropdown-header">
                    You have 4 new notifications
                    <Link href="#">
                      <span className="badge rounded-pill bg-primary p-2 ms-2">View all</span>
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="notification-item">
                    <i className="bi bi-exclamation-circle text-warning"></i>
                    <div>
                      <h4>Lorem Ipsum</h4>
                      <p>Quae dolorem earum veritatis oditseno</p>
                      <p>30 min. ago</p>
                    </div>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="dropdown-footer">
                    <Link href="#">Show all notifications</Link>
                  </li>
                </ul>
              </li>

              {/* Messages Dropdown */}
              <li className="nav-item dropdown position-relative">
                <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
                  <Image src="/assets/images/h-chat.png" alt="" width={50} height={50} className="h-icons" />
                  <span className="badge bg-success badge-number message-count">3</span>
                </Link>
                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
                  <li className="dropdown-header">
                    You have 3 new messages
                    <Link href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="message-item">a
                    <Link href="#">
                      <Image src="/assets/projectmanager/img/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
                      <div>
                        <h4>Maria Hudson</h4>
                        <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                        <p>4 hrs. ago</p>
                      </div>
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="dropdown-footer">
                    <Link href="#">Show all messages</Link>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown position-relative">
                {/* <Link href="#" className="nav-link nav-icon" data-bs-toggle="dropdown">
              <Image src="/assets/images/Settings.png" alt="" width={50} height={50} className="h-icons" />

            </Link> */}
                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
                  <li className="dropdown-header">
                    You have 3 new messages
                    <Link href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="message-item">
                    <Link href="#">
                      <Image src="/assets/projectmanager/img/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
                      <div>
                        <h4>Maria Hudson</h4>
                        <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                        <p>4 hrs. ago</p>
                      </div>
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>

                  <li className="dropdown-footer">
                    <Link href="#">Show all messages</Link>
                  </li>
                </ul>
              </li>

              {/* Profile Dropdown */}
              <li className="nav-item dropdown pe-3">
                <Link href="#" className="nav-link nav-profile d-flex align-items-center pe-0" data-bs-toggle="dropdown">
                  <Image src="/assets/images/profile-img.jpg" alt="Profile" width={40} height={40} className="rounded-circle" />
                  <span className="d-none d-md-block dropdown-toggle ps-2">
                    {username}
                  </span>
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
                      <i className="bi bi-person"></i>
                      <span>My Profile</span>
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <Link
                      href=""
                      className="dropdown-item d-flex align-items-center"
                    >
                      <i className="bi bi-person"></i>
                      <span>Settings</span>
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
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Sign Out</span>
                    </button>
                  </li>
                </ul>


              </li>
            </ul>

          </div>
        </div>
      </nav>
    </header>

  );
}