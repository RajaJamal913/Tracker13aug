"use client";

import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BreakButton from "@/components/trackerbtn";
import NotificationDropdown from "@/components/NotificationDropdown";
import StartTracker from '@/components/StartTracker';
import { Menu } from "primereact/menu";
import { Avatar } from "primereact/avatar";
import { Ripple } from "primereact/ripple";

export default function Header() {
  const [username, setUsername] = useState<string>("Loading...");
  const router = useRouter();
  const menu = useRef<Menu>(null);

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
    router.push("/userLogin");
  };

  const items = [
    {
      label: "Profile",
      icon: "pi pi-user",
      command: () => router.push("/profile"),
    },
    {
      label: "Settings",
      icon: "pi pi-cog",
      command: () => router.push("/settings"),
    },
    {
      label: "Notifications",
      icon: "pi pi-bell",
      command: () => router.push("<NotificationDropdown/>"),
    },
    { separator: true },
    {
      label: "Logout",
      icon: "pi pi-sign-out",
      command: handleLogout,
    },
  ];



  // new code 
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLinkClick = () => {
    setIsMenuOpen(false)
  }

  if (!isMounted) {
    return null
  }
  // new code 



  return (
    // <header id="header" className="header d-flex align-items-center">
    //   <div className="header-inner">
    //     <div className="welcome-wrapper-main d-flex align-items-center gap-2">
    //       { <StartTracker /> }
    //       <div className="d-flex align-items-center gap-2 d-none">
    //         <div className="header-welcome-wrapper">
    //           <Image
    //             src="/assets/images/header-user-icon.png"
    //             alt="User Icon"
    //             width={18}
    //             height={18}
    //           />
    //         </div>
    //         <div className="designation-wrapper d-flex align-items-center gap-2">
    //           <span className="user-name">{username}</span>
    //         </div>
    //       </div>
    //     </div>

    //     <nav className="header-nav ms-auto">
    //       <ul className="d-flex align-items-center list-unstyled m-0">
    //         {<NotificationDropdown /> }

    //         <li className="nav-item dropdown ms-3">
    //           <Link
    //             href="#"
    //             className="nav-link nav-icon h-chat-wrap"
    //             data-bs-toggle="dropdown"
    //           >
    //             <Image
    //               src="/assets/images/h-chat-icon-new.png"
    //               alt="Messages"
    //               width={18}
    //               height={18}
    //             />
    //             <span className="badge bg-success badge-number">3</span>
    //           </Link>
    //           <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
    //             <li className="dropdown-header">
    //               You have 3 new messages
    //               <Link href="#">
    //                 <span className="badge rounded-pill bg-primary ms-2 p-2">
    //                   View all
    //                 </span>
    //               </Link>
    //             </li>
    //             <li>
    //               <hr className="dropdown-divider" />
    //             </li>
    //             <li className="dropdown-footer">
    //               <Link href="#">Show all messages</Link>
    //             </li>
    //           </ul>
    //         </li>

    //         <li className="nav-item dropdown ms-3">
    //           <div className="nav-profile-wrapper">
    //             <Menu model={items} popup ref={menu} />
    //             <div
    //               onClick={(event) => menu.current?.toggle(event)}
    //               className="flex align-items-center gap-2 cursor-pointer nav-profile"
    //             >
    //               <Avatar
    //                 image="/assets/images/profile-img.jpg"
    //                 size="large"
    //                 shape="circle"
    //               />
    //               <span className="font-medium text-900">{username}</span>
    //               <i className="pi pi-angle-down text-600 text-sm"></i>
    //               <Ripple />
    //             </div>
    //           </div>
    //         </li>
    //       </ul>
    //     </nav>
    //   </div>
    //   <style jsx>{`
    //     .p-menu .p-menuitem:not(.p-highlight):not(.p-disabled).p-focus > .p-menuitem-content {
    //       color: #4b5563;
    //       background: linear-gradient(90deg, rgba(176, 122, 243, 0.27) 0%, rgba(208, 248, 254, 0.40) 46.15%, rgba(176, 122, 243, 0.28) 69.23%, rgba(208, 248, 254, 0.40) 100%) !important;
    //     }
    //     .p-menu.p-menu-overlay .p-menu-list {
    //       padding: 0px;
    //     }
    //     .p-menu.p-menu-overlay .p-menu-list a {
    //       text-decoration: none;
    //     }
    //   `}</style>
    // </header>

    <nav
      className="navbar navbar-expand-lg navbar-light bg-white border-bottom"
      style={{ backgroundColor: "#f8f9fa", padding: "0" }}
    >
      <div
        className="container-fluid d-flex flex-column" >
        <div className="header-top d-flex justify-content-between align-items-center gap-2 py-2 px-3 w-100 border-bottom">
          {/* Left Section: Menu Toggle & Dashboard Link */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            {/* Menu Toggle Button */}
            <button
              className="btn btn-ghost p-0"
              style={{
                border: "1px solid #e0e0e0",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.76552 14.4027C5.95696 14.4027 5.33675 14.3873 4.75436 14.353L4.58098 14.3432C4.30437 14.3274 4.01869 14.3109 3.73302 14.2825C3.09507 14.219 2.27469 14.0863 1.58512 13.6177C0.079509 12.5948 0.0436519 10.7425 0.0148872 9.25418L0.0121289 9.11312C-0.019394 7.56298 0.0101588 6.28945 0.105122 5.10497L0.112215 5.01435C0.14886 4.55135 0.190234 4.0265 0.356123 3.54617C0.700511 2.54728 1.44327 1.84235 2.34286 1.6607C2.89963 1.5484 5.50934 1.50781 7.12804 1.50781C7.85543 1.50781 9.61717 1.51609 10.261 1.59135C11.3836 1.72256 12.1473 2.31598 12.5973 3.40549C12.8857 4.1057 12.9058 4.96076 12.9231 5.71534C12.9267 5.86113 12.9302 6.00259 12.935 6.13775C12.9759 7.20362 12.9972 8.36287 13 9.68171C13.0031 11.3836 12.7399 13.4231 10.6618 14.0918C9.8461 14.3542 8.96937 14.3893 8.38068 14.3928L7.83376 14.3968C7.47834 14.3995 7.12173 14.4027 6.76552 14.4027ZM7.12764 2.29549C4.95099 2.29549 2.87441 2.35696 2.4985 2.43301C1.87553 2.55871 1.35343 3.07056 1.10085 3.80268C0.968062 4.18805 0.932205 4.63922 0.89753 5.07582L0.890043 5.16723C0.797444 6.32452 0.768285 7.57283 0.799808 9.09617L0.802566 9.23842C0.830543 10.6806 0.859702 12.1716 2.02802 12.9652C2.57061 13.334 3.26569 13.4432 3.81064 13.4976C4.08529 13.5248 4.35993 13.5405 4.6259 13.5555L4.80086 13.5657C5.36709 13.5988 5.97272 13.6142 6.76513 13.6142C7.11897 13.6142 7.47361 13.6114 7.82706 13.6083L8.37556 13.6044C9.22825 13.5992 9.87802 13.5153 10.4198 13.3411C11.6792 12.9361 12.2154 11.8418 12.2115 9.68289C12.2087 8.3739 12.1879 7.22411 12.1473 6.16769C12.1418 6.0282 12.1386 5.8828 12.1351 5.73307C12.1193 5.04745 12.1012 4.2704 11.8679 3.70536C11.5239 2.87079 11.0156 2.47241 10.1688 2.37351C9.75075 2.32465 8.61356 2.29549 7.12764 2.29549Z" fill="#9929FB" />
                <path d="M9.08311 3.99514C8.86639 3.99514 8.69026 3.82019 8.68908 3.60307C8.68671 3.1255 8.6875 2.22197 8.68829 1.36179L8.68908 0.394037C8.68908 0.176528 8.8656 0 9.08311 0C9.30101 0 9.47715 0.176528 9.47715 0.394037L9.47636 1.36218C9.47557 2.2204 9.47478 3.12195 9.47715 3.59834C9.47833 3.81585 9.30299 3.99317 9.08508 3.99435C9.08469 3.99514 9.0839 3.99514 9.08311 3.99514Z" fill="#9929FB" />
                <path d="M3.93243 3.99474C3.71571 3.99474 3.53918 3.8194 3.53839 3.60228C3.53642 3.14047 3.53721 2.27871 3.5376 1.44375L3.53839 0.394037C3.53839 0.176528 3.71492 0 3.93243 0C4.14993 0 4.32646 0.176528 4.32646 0.394037L4.32568 1.44454C4.32528 2.27793 4.32449 3.13732 4.32646 3.59874C4.32725 3.81625 4.1519 3.99356 3.934 3.99435L3.93243 3.99474Z" fill="#9929FB" />
                <path d="M3.61667 6.31627C2.1347 6.31627 0.954558 6.31391 0.505356 6.3076C0.287848 6.30445 0.114077 6.12556 0.11723 5.90766C0.120382 5.69212 0.296122 5.51953 0.511266 5.51953C0.513237 5.51953 0.515207 5.51953 0.517177 5.51953C1.46759 5.53372 5.921 5.52702 9.17337 5.52308C10.5139 5.52111 11.6893 5.51953 12.4116 5.51953C12.6295 5.51953 12.8056 5.69606 12.8056 5.91357C12.8056 6.13108 12.6295 6.3076 12.4116 6.3076C11.6897 6.3076 10.5151 6.30918 9.17456 6.31115C7.35135 6.31352 5.29133 6.31627 3.61667 6.31627Z" fill="#9929FB" />
              </svg>
            </button>
            { <StartTracker /> }


            {/* Dashboard Link - Hidden on mobile */}

            {/* <Link
              href="#"
              className="text-decoration-none d-none d-lg-flex"
              style={{ color: "#1a73e8", fontWeight: "500", fontSize: "14px", alignItems: "center" }}
            >
              <i className="bi bi-house-door me-2"></i>

              Dashboards
            </Link> */}
          </div>

          {/* Center Section: Search Bar */}
          <div style={{ flex: "1", maxWidth: "400px", margin: "0 16px", minWidth: "150px" }}>
            <div
              className="input-group"
              style={{ backgroundColor: "#fff", border: "1px solid #e0e0e0", borderRadius: "20px", padding: "4px 12px" }}
            >
              <span className="input-group-text p-0" style={{ border: "none", backgroundColor: "transparent" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.75 15.75L11.25 11.25M12.75 7.5C12.75 10.3995 10.3995 12.75 7.5 12.75C4.60051 12.75 2.25 10.3995 2.25 7.5C2.25 4.60051 4.60051 2.25 7.5 2.25C10.3995 2.25 12.75 4.60051 12.75 7.5Z" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search"
                style={{ border: "none", outline: "none", fontSize: "13px" }}
              />
              <button
                className="btn p-0"
                style={{ backgroundColor: "transparent", border: "none", color: "#e91e63", flexShrink: 0 }}
              >
                <i className="bi bi-heart" style={{ fontSize: "14px" }}></i>
              </button>
            </div>
          </div>

          {/* Right Section: Desktop Menu - Hidden on mobile/tablet */}
          <div
            style={{
              display: "none",
            }}
            className="d-none d-lg-flex"
          >
            <div className="d-flex align-items-center gap-2 th-btns-r-wrap">
              {/* Upgrade Button */}
              <button className="upgrade-btn"

              >
                <i className="bi bi-cloud-arrow-up me-1"></i>
                Upgrade
              </button>

              {/* Tech Flow Badge */}
              <button className="building-btn">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.975 4.1H1.67C1.41798 4.1 1.29196 4.1 1.1957 4.14905C1.11103 4.1922 1.04219 4.26101 0.999045 4.3457C0.95 4.44195 0.95 4.56795 0.95 4.82V8.6M7.025 4.1H8.33C8.58204 4.1 8.70804 4.1 8.8043 4.14905C8.88899 4.1922 8.9578 4.26101 9.00095 4.3457C9.05 4.44195 9.05 4.56795 9.05 4.82V8.6M7.025 8.6V1.94C7.025 1.43595 7.025 1.18393 6.9269 0.991409C6.84063 0.82206 6.70293 0.684378 6.5336 0.598095C6.34109 0.5 6.08904 0.5 5.585 0.5H4.415C3.91095 0.5 3.65893 0.5 3.46641 0.598095C3.29706 0.684378 3.15938 0.82206 3.0731 0.991409C2.975 1.18393 2.975 1.43595 2.975 1.94V8.6M9.5 8.6H0.5M4.55 2.3H5.45M4.55 4.1H5.45M4.55 5.9H5.45" stroke="#3BBEEF" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                Tech Flow
              </button>

              {/* Icon Buttons */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Grid Icon */}
                <button className="btn btn-ghost btn-sm p-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 1H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 1H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M1 3.99805H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 3.99805H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 3.99805H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M1 6.99414H1.00642" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M3.99658 6.99414H4.00301" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                    <path d="M6.99316 6.99414H6.99959" stroke="#5C4727" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </button>

                {/* Envelope Icon */}
                <button
                  className="btn btn-ghost btn-sm p-0"

                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.25 2.75V7.25M5 4.4375V7.25M2.75 6.125V7.25M1.625 9.5H8.375C8.99632 9.5 9.5 8.99632 9.5 8.375V1.625C9.5 1.00368 8.99632 0.5 8.375 0.5H1.625C1.00368 0.5 0.5 1.00368 0.5 1.625V8.375C0.5 8.99632 1.00368 9.5 1.625 9.5Z" stroke="#7B224D" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </button>

                {/* Image Icon */}
                <button
                  className="btn btn-ghost btn-sm p-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.5 2L4.4453 4.6302C4.7812 4.85413 5.2188 4.85413 5.5547 4.6302L9.5 2M1.5 7.5H8.5C9.05228 7.5 9.5 7.05228 9.5 6.5V1.5C9.5 0.947715 9.05228 0.5 8.5 0.5H1.5C0.947715 0.5 0.5 0.947715 0.5 1.5V6.5C0.5 7.05228 0.947715 7.5 1.5 7.5Z" stroke="#DA53FF" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>

                {/* Smiley Icon */}
                <button
                  className="btn btn-ghost btn-sm p-0">
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.6875 8.27778H9.5L8.70973 7.49726C8.4954 7.28559 8.375 6.99849 8.375 6.69914V4.94445C8.375 3.49309 7.43584 2.25838 6.125 1.80079V1.61111C6.125 0.997461 5.62132 0.5 5 0.5C4.37868 0.5 3.875 0.997461 3.875 1.61111V1.80079C2.56416 2.25838 1.625 3.49309 1.625 4.94445V6.69914C1.625 6.99849 1.5046 7.28559 1.29027 7.49726L0.5 8.27778H3.3125M6.6875 8.27778V8.83333C6.6875 9.75381 5.93198 10.5 5 10.5C4.06802 10.5 3.3125 9.75381 3.3125 8.83333V8.27778M6.6875 8.27778H3.3125" stroke="#FFB300" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </button>
                <button
                  className="btn btn-ghost btn-sm p-0">
                  <NotificationDropdown />

                </button>
                


                {/* Plus Icon */}
                <button
                  className="btn btn-ghost btn-sm p-0">
                  <svg width="11" height="10" viewBox="0 0 11 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.665039 4.66406H9.66504H0.665039ZM5.16504 0.664062V8.66406V0.664062Z" fill="#D9D9D9" />
                    <path d="M0.665039 4.66406H9.66504M5.16504 0.664062V8.66406" stroke="#474747" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </button>
              </div>

              {/* User Profile Dropdown */}
              <div className="nav-profile-wrapper">
                <Menu model={items} popup ref={menu} />
                <div
                  onClick={(event) => menu.current?.toggle(event)}
                  className="flex align-items-center gap-2 cursor-pointer nav-profile"
                >
                  <Avatar
                    image="/assets/images/profile-img.jpg"
                    size="large"
                    shape="circle"
                  />
                  <span className="font-medium text-900">{username}</span>
                  <i className="pi pi-angle-down text-600 text-sm"></i>
                  <Ripple />
                </div>
              </div>









            </div>
          </div>
        </div>
        <div className="header-bottom d-flex justify-content-between align-items-center gap-2 py-2 px-3 w-100">
          <div className="left-wrap d-flex align-items-center gap-2">
            <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="22" height="20" rx="5" fill="#355DC9" />
              <path fill-rule="evenodd" clip-rule="evenodd" d="M6.04226 8.11688C6.04226 6.39548 7.44389 5 9.17288 5C10.9019 5 12.3035 6.39548 12.3035 8.11688C12.3035 9.19 11.7588 10.1361 10.9303 10.6966C12.1579 11.2446 13.0716 12.3498 13.327 13.6846C13.3816 13.9701 13.3272 14.2469 13.1695 14.4651C13.0116 14.6835 12.7649 14.8226 12.4744 14.8597C11.9055 14.9322 10.911 15 9.17382 15C7.43664 15 6.44216 14.9322 5.87324 14.8597C5.58267 14.8226 5.33603 14.6835 5.17815 14.4651C5.02043 14.2469 4.96599 13.9701 5.0206 13.6846C5.27595 12.3502 6.18913 11.2452 7.41616 10.6971C6.58725 10.1366 6.04226 9.19031 6.04226 8.11688ZM13.8047 14.9203C13.7867 14.9451 13.7682 14.9693 13.7491 14.9929C14.9305 14.9737 15.6674 14.9183 16.1268 14.8597C16.4173 14.8226 16.664 14.6835 16.8219 14.4651C16.9796 14.2469 17.034 13.9701 16.9794 13.6846C16.724 12.3498 15.8103 11.2446 14.5827 10.6966C15.4112 10.1361 15.9559 9.19 15.9559 8.11688C15.9559 6.39548 14.5543 5 12.8253 5C12.4486 5 12.0875 5.06622 11.7531 5.18759C12.5703 5.90167 13.0861 6.9493 13.0861 8.11688C13.0861 9.04161 12.7622 9.89065 12.2227 10.5581C13.1771 11.2756 13.8635 12.3247 14.0958 13.5388C14.1861 14.0107 14.1013 14.5099 13.8047 14.9203Z" fill="white" />
            </svg>

            <span>Dashboard</span>
          </div>
          <div className="right-wrap d-flex align-items-center gap-2 flex-wrap">
            <a href="/dashboard/Projects/Createproject" className="h-btn-1">
              <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.0454 10.3418V15.9554" stroke="#767676" stroke-linecap="round" />
                <path d="M12.7046 13H7.09095" stroke="#767676" stroke-linecap="round" />
                <mask id="path-3-inside-1_1522_3620" fill="white">
                  <path d="M4.13636 15.3636H1.18182V2.95455H2.95455V4.72727H10.0455V2.95455H11.8182V8.27273H13V2.95455C13 2.64111 12.8755 2.34051 12.6539 2.11887C12.4322 1.89724 12.1316 1.77273 11.8182 1.77273H10.0455V1.18182C10.0455 0.86838 9.92094 0.56778 9.69931 0.346146C9.47767 0.124513 9.17707 0 8.86364 0H4.13636C3.82293 0 3.52233 0.124513 3.30069 0.346146C3.07906 0.56778 2.95455 0.86838 2.95455 1.18182V1.77273H1.18182C0.86838 1.77273 0.56778 1.89724 0.346146 2.11887C0.124513 2.34051 0 2.64111 0 2.95455V15.3636C0 15.6771 0.124513 15.9777 0.346146 16.1993C0.56778 16.4209 0.86838 16.5455 1.18182 16.5455H4.13636V15.3636ZM4.13636 1.18182H8.86364V3.54545H4.13636V1.18182Z" />
                </mask>
                <path d="M4.13636 15.3636H1.18182V2.95455H2.95455V4.72727H10.0455V2.95455H11.8182V8.27273H13V2.95455C13 2.64111 12.8755 2.34051 12.6539 2.11887C12.4322 1.89724 12.1316 1.77273 11.8182 1.77273H10.0455V1.18182C10.0455 0.86838 9.92094 0.56778 9.69931 0.346146C9.47767 0.124513 9.17707 0 8.86364 0H4.13636C3.82293 0 3.52233 0.124513 3.30069 0.346146C3.07906 0.56778 2.95455 0.86838 2.95455 1.18182V1.77273H1.18182C0.86838 1.77273 0.56778 1.89724 0.346146 2.11887C0.124513 2.34051 0 2.64111 0 2.95455V15.3636C0 15.6771 0.124513 15.9777 0.346146 16.1993C0.56778 16.4209 0.86838 16.5455 1.18182 16.5455H4.13636V15.3636ZM4.13636 1.18182H8.86364V3.54545H4.13636V1.18182Z" fill="#767676" />
                <path d="M4.13636 15.3636H6.13636V13.3636H4.13636V15.3636ZM1.18182 15.3636H-0.818182V17.3636H1.18182V15.3636ZM1.18182 2.95455V0.954545H-0.818182V2.95455H1.18182ZM2.95455 2.95455H4.95455V0.954545H2.95455V2.95455ZM2.95455 4.72727H0.954545V6.72727H2.95455V4.72727ZM10.0455 4.72727V6.72727H12.0455V4.72727H10.0455ZM10.0455 2.95455V0.954545H8.04545V2.95455H10.0455ZM11.8182 2.95455H13.8182V0.954545H11.8182V2.95455ZM11.8182 8.27273H9.81818V10.2727H11.8182V8.27273ZM13 8.27273V10.2727H15V8.27273H13ZM11.8182 1.77273V-0.227273V1.77273ZM10.0455 1.77273H8.04545V3.77273H10.0455V1.77273ZM8.86364 0V-2V0ZM4.13636 0V-2V0ZM2.95455 1.77273V3.77273H4.95455V1.77273H2.95455ZM1.18182 1.77273V-0.227273V1.77273ZM0 2.95455H-2H0ZM0 15.3636H-2H0ZM0.346146 16.1993L-1.06807 17.6135L0.346146 16.1993ZM4.13636 16.5455V18.5455H6.13636V16.5455H4.13636ZM4.13636 1.18182V-0.818182H2.13636V1.18182H4.13636ZM8.86364 1.18182H10.8636V-0.818182H8.86364V1.18182ZM8.86364 3.54545V5.54545H10.8636V3.54545H8.86364ZM4.13636 3.54545H2.13636V5.54545H4.13636V3.54545ZM4.13636 15.3636V13.3636H1.18182V15.3636V17.3636H4.13636V15.3636ZM1.18182 15.3636H3.18182V2.95455H1.18182H-0.818182V15.3636H1.18182ZM1.18182 2.95455V4.95455H2.95455V2.95455V0.954545H1.18182V2.95455ZM2.95455 2.95455H0.954545V4.72727H2.95455H4.95455V2.95455H2.95455ZM2.95455 4.72727V6.72727H10.0455V4.72727V2.72727H2.95455V4.72727ZM10.0455 4.72727H12.0455V2.95455H10.0455H8.04545V4.72727H10.0455ZM10.0455 2.95455V4.95455H11.8182V2.95455V0.954545H10.0455V2.95455ZM11.8182 2.95455H9.81818V8.27273H11.8182H13.8182V2.95455H11.8182ZM11.8182 8.27273V10.2727H13V8.27273V6.27273H11.8182V8.27273ZM13 8.27273H15V2.95455H13H11V8.27273H13ZM13 2.95455H15C15 2.11067 14.6648 1.30137 14.0681 0.70466L12.6539 2.11887L11.2396 3.53309C11.0862 3.37965 11 3.17154 11 2.95455H13ZM12.6539 2.11887L14.0681 0.70466C13.4714 0.107954 12.6621 -0.227273 11.8182 -0.227273V1.77273V3.77273C11.6012 3.77273 11.3931 3.68653 11.2396 3.53309L12.6539 2.11887ZM11.8182 1.77273V-0.227273H10.0455V1.77273V3.77273H11.8182V1.77273ZM10.0455 1.77273H12.0455V1.18182H10.0455H8.04545V1.77273H10.0455ZM10.0455 1.18182H12.0455C12.0455 0.337947 11.7102 -0.471361 11.1135 -1.06807L9.69931 0.346146L8.28509 1.76036C8.13166 1.60692 8.04545 1.39881 8.04545 1.18182H10.0455ZM9.69931 0.346146L11.1135 -1.06807C10.5168 -1.66477 9.70751 -2 8.86364 -2V0V2C8.64664 2 8.43853 1.9138 8.28509 1.76036L9.69931 0.346146ZM8.86364 0V-2H4.13636V0V2H8.86364V0ZM4.13636 0V-2C3.29249 -2 2.48319 -1.66477 1.88648 -1.06807L3.30069 0.346146L4.71491 1.76036C4.56147 1.9138 4.35336 2 4.13636 2V0ZM3.30069 0.346146L1.88648 -1.06807C1.28977 -0.471361 0.954545 0.337947 0.954545 1.18182H2.95455H4.95455C4.95455 1.39881 4.86834 1.60692 4.71491 1.76036L3.30069 0.346146ZM2.95455 1.18182H0.954545V1.77273H2.95455H4.95455V1.18182H2.95455ZM2.95455 1.77273V-0.227273H1.18182V1.77273V3.77273H2.95455V1.77273ZM1.18182 1.77273V-0.227273C0.337948 -0.227273 -0.47136 0.107953 -1.06807 0.70466L0.346146 2.11887L1.76036 3.53309C1.60692 3.68653 1.39881 3.77273 1.18182 3.77273V1.77273ZM0.346146 2.11887L-1.06807 0.70466C-1.66477 1.30137 -2 2.11068 -2 2.95455H0H2C2 3.17154 1.9138 3.37965 1.76036 3.53309L0.346146 2.11887ZM0 2.95455H-2V15.3636H0H2V2.95455H0ZM0 15.3636H-2C-2 16.2075 -1.66477 17.0168 -1.06807 17.6135L0.346146 16.1993L1.76036 14.7851C1.9138 14.9385 2 15.1466 2 15.3636H0ZM0.346146 16.1993L-1.06807 17.6135C-0.471361 18.2102 0.337947 18.5455 1.18182 18.5455V16.5455V14.5455C1.39881 14.5455 1.60692 14.6317 1.76036 14.7851L0.346146 16.1993ZM1.18182 16.5455V18.5455H4.13636V16.5455V14.5455H1.18182V16.5455ZM4.13636 16.5455H6.13636V15.3636H4.13636H2.13636V16.5455H4.13636ZM4.13636 1.18182V3.18182H8.86364V1.18182V-0.818182H4.13636V1.18182ZM8.86364 1.18182H6.86364V3.54545H8.86364H10.8636V1.18182H8.86364ZM8.86364 3.54545V1.54545H4.13636V3.54545V5.54545H8.86364V3.54545ZM4.13636 3.54545H6.13636V1.18182H4.13636H2.13636V3.54545H4.13636Z" fill="#767676" mask="url(#path-3-inside-1_1522_3620)" />
              </svg>
              <span>Create Project</span>
            </a>
            <a href="/dashboard/task-new/addtask" className="h-btn-3">
              <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.4582 8.12536C12.3145 8.12536 12.1767 8.18243 12.0752 8.28401C11.9736 8.38559 11.9165 8.52337 11.9165 8.66703V10.292C11.9165 10.4357 11.9736 10.5735 12.0752 10.675C12.1767 10.7766 12.3145 10.8337 12.4582 10.8337C12.6018 10.8337 12.7396 10.7766 12.8412 10.675C12.9428 10.5735 12.9998 10.4357 12.9998 10.292V8.66703C12.9998 8.52337 12.9428 8.38559 12.8412 8.28401C12.7396 8.18243 12.6018 8.12536 12.4582 8.12536ZM12.7615 6.05078C12.7314 6.03016 12.6986 6.01376 12.664 6.00203C12.6317 5.98572 12.5969 5.97474 12.5611 5.96953C12.4741 5.9521 12.3841 5.95633 12.2991 5.98183C12.2141 6.00733 12.1367 6.05333 12.0736 6.11578C12.0234 6.16639 11.9837 6.22642 11.9567 6.29241C11.9298 6.35841 11.9161 6.42907 11.9165 6.50036C11.9165 6.64402 11.9736 6.78179 12.0752 6.88338C12.1767 6.98496 12.3145 7.04203 12.4582 7.04203C12.6018 7.04203 12.7396 6.98496 12.8412 6.88338C12.9428 6.78179 12.9998 6.64402 12.9998 6.50036C12.9979 6.35695 12.9417 6.21958 12.8428 6.11578L12.7615 6.05078Z" fill="#A47303" />
                <path d="M11.375 1.625H10.8333C10.8333 1.19402 10.6621 0.780698 10.3574 0.475951C10.0526 0.171205 9.63931 0 9.20833 0H3.79167C3.36069 0 2.94736 0.171205 2.64262 0.475951C2.33787 0.780698 2.16667 1.19402 2.16667 1.625H1.625C1.20143 1.62485 0.794536 1.79009 0.491005 2.08553C0.187474 2.38097 0.0112953 2.78324 0 3.20667V14.6683C0.0112953 15.0918 0.187474 15.494 0.491005 15.7895C0.794536 16.0849 1.20143 16.2502 1.625 16.25H11.375C11.7986 16.2502 12.2055 16.0849 12.509 15.7895C12.8125 15.494 12.9887 15.0918 13 14.6683V11.9167C13 11.773 12.9429 11.6352 12.8414 11.5337C12.7398 11.4321 12.602 11.375 12.4583 11.375C12.3147 11.375 12.1769 11.4321 12.0753 11.5337C11.9737 11.6352 11.9167 11.773 11.9167 11.9167V14.6683C11.9058 14.8044 11.8439 14.9312 11.7435 15.0236C11.6431 15.116 11.5115 15.1671 11.375 15.1667H1.625C1.48854 15.1671 1.35695 15.116 1.25653 15.0236C1.1561 14.9312 1.09425 14.8044 1.08333 14.6683V3.20667C1.09425 3.07065 1.1561 2.94376 1.25653 2.85137C1.35695 2.75898 1.48854 2.7079 1.625 2.70833H2.16667C2.16667 3.13931 2.33787 3.55264 2.64262 3.85738C2.94736 4.16213 3.36069 4.33333 3.79167 4.33333H9.20833C9.63931 4.33333 10.0526 4.16213 10.3574 3.85738C10.6621 3.55264 10.8333 3.13931 10.8333 2.70833H11.375C11.5115 2.7079 11.6431 2.75898 11.7435 2.85137C11.8439 2.94376 11.9058 3.07065 11.9167 3.20667V4.33333C11.9167 4.47699 11.9737 4.61477 12.0753 4.71635C12.1769 4.81793 12.3147 4.875 12.4583 4.875C12.602 4.875 12.7398 4.81793 12.8414 4.71635C12.9429 4.61477 13 4.47699 13 4.33333V3.20667C12.9887 2.78324 12.8125 2.38097 12.509 2.08553C12.2055 1.79009 11.7986 1.62485 11.375 1.625ZM9.75 2.70833C9.75 2.85199 9.69293 2.98977 9.59135 3.09135C9.48977 3.19293 9.35199 3.25 9.20833 3.25H3.79167C3.64801 3.25 3.51023 3.19293 3.40865 3.09135C3.30707 2.98977 3.25 2.85199 3.25 2.70833V1.625C3.25 1.48134 3.30707 1.34357 3.40865 1.24198C3.51023 1.1404 3.64801 1.08333 3.79167 1.08333H9.20833C9.35199 1.08333 9.48977 1.1404 9.59135 1.24198C9.69293 1.34357 9.75 1.48134 9.75 1.625V2.70833Z" fill="#A47303" />
                <path d="M9.89016 6.67786L5.41599 11.672L3.09224 9.36453C2.98862 9.27579 2.85533 9.22942 2.719 9.23468C2.58268 9.23995 2.45336 9.29646 2.35689 9.39293C2.26043 9.4894 2.20391 9.61871 2.19865 9.75504C2.19338 9.89136 2.23975 10.0247 2.32849 10.1283L5.03682 12.8366C5.13683 12.9387 5.27311 12.9971 5.41599 12.9991C5.48974 12.9974 5.56238 12.9807 5.62944 12.95C5.6965 12.9193 5.75658 12.8751 5.80599 12.8204L10.681 7.40369C10.7772 7.29667 10.827 7.15579 10.8194 7.01205C10.8118 6.86831 10.7474 6.73349 10.6404 6.63723C10.5333 6.54098 10.3925 6.49119 10.2487 6.49881C10.105 6.50643 9.97016 6.57083 9.87391 6.67786H9.89016Z" fill="#A47303" />
              </svg>

              <span>Smart Task</span>
            </a>
            <a href="/dashboard/AiPowered" className="h-btn-2">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.5 0.5C11.0304 0.5 11.5391 0.710714 11.9142 1.08579C12.2893 1.46086 12.5 1.96957 12.5 2.5V7.83333C12.5 8.36377 12.2893 8.87247 11.9142 9.24755C11.5391 9.62262 11.0304 9.83333 10.5 9.83333H7.16667L3.83333 11.8333V9.83333H2.5C1.96957 9.83333 1.46086 9.62262 1.08579 9.24755C0.710714 8.87247 0.5 8.36377 0.5 7.83333V2.5C0.5 1.96957 0.710714 1.46086 1.08579 1.08579C1.46086 0.710714 1.96957 0.5 2.5 0.5H10.5Z" stroke="#059900" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M4.8335 3.83398H4.84016" stroke="#059900" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M8.1665 3.83398H8.17317" stroke="#059900" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M4.8335 6.5C5.05075 6.72173 5.31006 6.89789 5.59625 7.01814C5.88243 7.1384 6.18974 7.20034 6.50016 7.20034C6.81059 7.20034 7.11789 7.1384 7.40408 7.01814C7.69026 6.89789 7.94958 6.72173 8.16683 6.5" stroke="#059900" stroke-linecap="round" stroke-linejoin="round" />
              </svg>


              <span>AI Powered</span>
            </a>

            <a href="#" className="h-btn-4">
              <span>Ask AI</span>
            </a>
            <a href="/dashboard/chat" className="h-btn-5">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.54732 12.4073L7.8751 11.8535L7.09455 11.3915L6.76677 11.9453L7.54732 12.4073ZM5.1249 11.8535L5.45268 12.4073L6.23317 11.9453L5.90539 11.3915L5.1249 11.8535ZM6.76677 11.9453C6.65026 12.1422 6.34974 12.1422 6.23317 11.9453L5.45268 12.4073C5.92044 13.1975 7.07956 13.1975 7.54732 12.4073L6.76677 11.9453ZM5.59302 0.906977H7.40698V1.24591e-07H5.59302V0.906977ZM12.093 5.59302V6.19767H13V5.59302H12.093ZM0.906977 6.19767V5.59302H1.24591e-07V6.19767H0.906977ZM1.24591e-07 6.19767C1.24591e-07 6.8958 -0.000247802 7.44211 0.0298155 7.88272C0.0601629 8.32744 0.122883 8.69754 0.26465 9.03978L1.10259 8.69271C1.01422 8.47939 0.961885 8.21951 0.934694 7.82098C0.907225 7.4184 0.906977 6.9082 0.906977 6.19767H1.24591e-07ZM3.96198 10.274C3.20287 10.2609 2.80512 10.2126 2.49333 10.0835L2.14625 10.9214C2.63298 11.123 3.18735 11.1677 3.94635 11.1808L3.96198 10.274ZM0.26465 9.03978C0.617518 9.89167 1.29435 10.5685 2.14625 10.9214L2.49333 10.0835C1.86367 9.82262 1.3634 9.32239 1.10259 8.69271L0.26465 9.03978ZM12.093 6.19767C12.093 6.9082 12.0928 7.4184 12.0653 7.82098C12.0381 8.21951 11.9858 8.47939 11.8974 8.69271L12.7353 9.03978C12.8771 8.69754 12.9398 8.32744 12.9702 7.88272C13.0002 7.44211 13 6.8958 13 6.19767H12.093ZM9.05362 11.1808C9.81264 11.1677 10.367 11.123 10.8537 10.9214L10.5067 10.0835C10.1949 10.2126 9.7971 10.2609 9.03802 10.274L9.05362 11.1808ZM11.8974 8.69271C11.6366 9.32239 11.1363 9.82262 10.5067 10.0835L10.8537 10.9214C11.7056 10.5685 12.3825 9.89167 12.7353 9.03978L11.8974 8.69271ZM7.40698 0.906977C8.40538 0.906977 9.12237 0.907455 9.68161 0.960628C10.2341 1.01316 10.5857 1.11391 10.8659 1.28566L11.3399 0.512333C10.8931 0.238577 10.3863 0.116571 9.76747 0.0577261C9.15533 -0.000477575 8.38784 1.24591e-07 7.40698 1.24591e-07V0.906977ZM13 5.59302C13 4.61216 13.0005 3.84467 12.9423 3.23253C12.8834 2.61364 12.7614 2.10688 12.4877 1.66015L11.7143 2.13404C11.8861 2.41432 11.9868 2.76588 12.0394 3.31838C12.0925 3.87763 12.093 4.5946 12.093 5.59302H13ZM10.8659 1.28566C11.2117 1.49755 11.5025 1.78827 11.7143 2.13404L12.4877 1.66015C12.201 1.19234 11.8077 0.79901 11.3399 0.512333L10.8659 1.28566ZM5.59302 1.24591e-07C4.61216 1.24591e-07 3.84467 -0.000477575 3.23253 0.0577261C2.61364 0.116571 2.10688 0.238577 1.66015 0.512333L2.13404 1.28566C2.41432 1.11391 2.76588 1.01316 3.31838 0.960628C3.87763 0.907455 4.5946 0.906977 5.59302 0.906977V1.24591e-07ZM0.906977 5.59302C0.906977 4.5946 0.907455 3.87763 0.960628 3.31838C1.01316 2.76588 1.11391 2.41432 1.28566 2.13404L0.512333 1.66015C0.238577 2.10688 0.116571 2.61364 0.0577261 3.23253C-0.000477575 3.84467 1.24591e-07 4.61216 1.24591e-07 5.59302H0.906977ZM1.66015 0.512333C1.19234 0.79901 0.79901 1.19234 0.512333 1.66015L1.28566 2.13404C1.49755 1.78827 1.78827 1.49755 2.13404 1.28566L1.66015 0.512333ZM5.90539 11.3915C5.78264 11.1841 5.67489 11.0011 5.57011 10.8573C5.4597 10.7059 5.33314 10.5695 5.15759 10.4674L4.7016 11.2515C4.73026 11.2681 4.76932 11.2985 4.83712 11.3915C4.91051 11.4922 4.99342 11.6314 5.1249 11.8535L5.90539 11.3915ZM3.94635 11.1808C4.21185 11.1854 4.38001 11.1888 4.50821 11.2029C4.62799 11.2162 4.67442 11.2356 4.7016 11.2515L5.15759 10.4674C4.98057 10.3644 4.79637 10.3223 4.60803 10.3014C4.4281 10.2815 4.21064 10.2783 3.96198 10.274L3.94635 11.1808ZM7.8751 11.8535C8.00655 11.6314 8.08945 11.4922 8.16285 11.3915C8.23063 11.2985 8.26969 11.2681 8.29835 11.2515L7.84239 10.4674C7.66686 10.5695 7.54024 10.7059 7.42989 10.8573C7.32511 11.0011 7.21736 11.1841 7.09455 11.3915L7.8751 11.8535ZM9.03802 10.274C8.78933 10.2783 8.5719 10.2815 8.39195 10.3014C8.2036 10.3223 8.01943 10.3644 7.84239 10.4674L8.29835 11.2515C8.32556 11.2356 8.372 11.2162 8.49178 11.2029C8.61997 11.1888 8.78812 11.1854 9.05362 11.1808L9.03802 10.274Z" fill="#FF278F" />
                <path d="M4.08154 5.89453H4.08698M6.49471 5.89453H6.50015M8.91331 5.89453H8.91875" stroke="#FF278F" stroke-linecap="round" stroke-linejoin="round" />
              </svg>

              <span>Chat</span>
            </a>
          </div>
        </div>

        <button
          className="btn p-0 d-lg-none "
          style={{
            backgroundColor: "transparent",
            border: "1px solid #e0e0e0",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginLeft: "auto",
          }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <i className="bi bi-three-dots-vertical" style={{ fontSize: "18px" }}></i>
        </button>
      </div>

      {isMenuOpen && (
        <div
          className="d-lg-none w-100"
          style={{
            backgroundColor: "#fff",
            borderTop: "1px solid #e0e0e0",
            padding: "12px 20px",
            maxHeight: "500px",
            overflowY: "auto",
          }}
        >
          {/* Dashboard Link */}
          <Link
            href="#"
            className="text-decoration-none d-flex align-items-center"
            style={{
              color: "#1a73e8",
              fontWeight: "500",
              fontSize: "14px",
              padding: "10px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
            onClick={handleLinkClick}
          >
            <i className="bi bi-house-door me-2"></i>

            Dashboard
          </Link>

          {/* Upgrade Button */}
          <button
            style={{
              backgroundColor: "#8e7cc3",
              color: "white",
              borderRadius: "20px",
              padding: "8px 16px",
              fontSize: "13px",
              border: "none",
              fontWeight: "500",
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
              margin: "10px 0",
            }}
          >
            <i className="bi bi-cloud-arrow-up me-1"></i>
            Upgrade
          </button>

          {/* Tech Flow Badge */}
          <div
            style={{
              backgroundColor: "#e8f0fe",
              color: "#1a73e8",
              padding: "10px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            <i className="bi bi-cpu me-1"></i>
            Tech Flow
          </div>

          {/* Divider */}
          <div style={{ borderBottom: "1px solid #f0f0f0", margin: "10px 0" }}></div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "10px 0" }}>
            <button
              className="btn btn-sm w-100"
              style={{
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <i className="bi bi-grid-3x2 me-2"></i>
              Grid
            </button>

            <button
              className="btn btn-sm w-100"
              style={{
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <i className="bi bi-envelope me-2"></i>
              Messages
            </button>

            <button
              className="btn btn-sm w-100"
              style={{
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <i className="bi bi-image me-2"></i>
              Gallery
            </button>

            <button
              className="btn btn-sm w-100"
              style={{
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <i className="bi bi-emoji-smile me-2"></i>
              Feedback
            </button>

            <button
              className="btn btn-sm w-100"
              style={{
                backgroundColor: "#f5f5f5",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <i className="bi bi-plus me-2"></i>
              More
            </button>
          </div>

          {/* Divider */}
          <div style={{ borderBottom: "1px solid #f0f0f0", margin: "10px 0" }}></div>

          {/* User Profile Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="User Avatar"
              className="rounded-circle"
              style={{ width: "32px", height: "32px" }}
            />
            <div>
              <a
                href="#"
                className="text-decoration-none d-block"
                style={{ color: "#333", fontSize: "14px", fontWeight: "500" }}
              >
                Profile
              </a>
              <a href="#" className="text-decoration-none d-block" style={{ color: "#999", fontSize: "12px" }}>
                Settings
              </a>
            </div>
          </div>

          <button
            style={{
              backgroundColor: "transparent",
              color: "#d32f2f",
              border: "1px solid #d32f2f",
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "12px",
              cursor: "pointer",
              width: "100%",
              marginTop: "10px",
            }}
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}