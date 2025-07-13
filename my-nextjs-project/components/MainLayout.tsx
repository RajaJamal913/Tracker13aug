// main layout components 
'use client';

import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";

interface Props {
  children: React.ReactNode;
}


export default function MainLayout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };

  return (
    <main id="main" className="flex-1">
      <div className="container-fluid px-0">
        <div className={`row main-inner-row ${collapsed ? "small_sidebar_partner" : ""}`}>
          <div className={`partner-sidebar-col ${collapsed ? "col-lg-1" : "col-lg-2"} col-md-12 px-lg-0`}>
            <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
            
          </div>
          <div className={`translate-content-col ${collapsed ? "col-lg-11" : "col-lg-10"} col-md-12 px-lg-0`}>
            <Header />
            <div className="content-main px-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
