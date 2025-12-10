'use client';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import BootstrapClient from "@/components/BootstrapClient";
import Script from 'next/script'
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'react-datepicker/dist/react-datepicker.css';
import Head from 'next/head';
import { useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const closeSidebar = () => {
    setIsSidebarCollapsed(false);
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden g-scroll`}
      >
        <Head>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
            integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </Head>
        <BootstrapClient />
        
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          strategy="lazyOnload"
        />

        <main id="main" className="">
          <div className="container-fluid">
            <div className={`row main-inner-row ${isSidebarCollapsed ? 'expanded' : ''}`}>
              <div className={`col-3 col-xl-2 px-lg-0 sidebar-col ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <Sidebar 
                  collapsed={isSidebarCollapsed} 
                  toggleSidebar={closeSidebar} 
                />
              </div>

              
              <div className={`col-12 col-xl-10 px-lg-0 content-col px-0 ${isSidebarCollapsed ? 'col-lg-12' : ''}`}>
                <Header onToggleSidebar={toggleSidebar} />
                <div className="content-main px-sm-3 g-scroll py-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}