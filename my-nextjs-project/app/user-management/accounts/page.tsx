"use client";
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "react-bootstrap";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";
import { Table, Form } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";

export default function Home() {




  return (
    <div className="container-fluid">
      <div className="row mt-4 mb-4">
        <div className="col-lg-4 mb-5">
          <div className="workspace-card ws-1">
            <h5 className="mb-1">Hamza’s Workspace</h5>
            <h6 className="mb-1">Hamza</h6>
            <p className="workspace-role mb-3">
              <img src="/assets/images/user-svgrepo-com.png" alt="" />
              <span>Owner</span>
            </p>
            <p className="text-muted mb-3">
              Member since: <strong className="text-dark">Jan 04, 2025</strong>
            </p>

            <div className="form-check form-switch d-flex align-items-center mb-3">
              <input className="form-check-input" type="checkbox" id="emailToggle" checked style={{ accentColor: "#a259ff" }} />
              <label className="form-check-label toggle-label" htmlFor="emailToggle">Get email Notifications</label>
            </div>

            <div className="divider"></div>

            <div className="leave-btn">
              <i className="bi bi-arrow-counterclockwise me-2"></i> Leave workspace
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-5">
          <div className="workspace-card ws-2">
            <h5 className="mb-1">Hamza’s Workspace</h5>
            <h6 className="mb-1">Hamza</h6>
            <p className="workspace-role mb-3">
              <img src="/assets/images/user-svgrepo-com.png" alt="" />
              <span>Owner</span>
            </p>
            <p className="text-muted mb-3">
              Member since: <strong className="text-dark">Jan 04, 2025</strong>
            </p>

            <div className="form-check form-switch d-flex align-items-center mb-3">
              <input className="form-check-input" type="checkbox" id="emailToggle" checked style={{ accentColor: "#a259ff" }} />
              <label className="form-check-label toggle-label" htmlFor="emailToggle">Get email Notifications</label>
            </div>

            <div className="divider"></div>

            <div className="leave-btn">
              <i className="bi bi-arrow-counterclockwise me-2"></i> Leave workspace
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-5">
          <div className="workspace-card ws-3">
            <h5 className="mb-1">Hamza’s Workspace</h5>
            <h6 className="mb-1">Hamza</h6>
            <p className="workspace-role mb-3">
              <img src="/assets/images/user-svgrepo-com.png" alt="" />
              <span>Owner</span>
            </p>
            <p className="text-muted mb-3">
              Member since: <strong className="text-dark">Jan 04, 2025</strong>
            </p>

            <div className="form-check form-switch d-flex align-items-center mb-3">
              <input className="form-check-input" type="checkbox" id="emailToggle" checked style={{ accentColor: "#a259ff" }} />
              <label className="form-check-label toggle-label" htmlFor="emailToggle">Get email Notifications</label>
            </div>

            <div className="divider"></div>

            <div className="leave-btn">
              <i className="bi bi-arrow-counterclockwise me-2"></i> Leave workspace
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-5">
          <div className="workspace-card ws-4">
            <h5 className="mb-1">Hamza’s Workspace</h5>
            <h6 className="mb-1">Hamza</h6>
            <p className="workspace-role mb-3">
              <img src="/assets/images/user-svgrepo-com.png" alt="" />
              <span>Owner</span>
            </p>
            <p className="text-muted mb-3">
              Member since: <strong className="text-dark">Jan 04, 2025</strong>
            </p>

            <div className="form-check form-switch d-flex align-items-center mb-3">
              <input className="form-check-input" type="checkbox" id="emailToggle" checked style={{ accentColor: "#a259ff" }} />
              <label className="form-check-label toggle-label" htmlFor="emailToggle">Get email Notifications</label>
            </div>

            <div className="divider"></div>

            <div className="leave-btn">
              <i className="bi bi-arrow-counterclockwise me-2"></i> Leave workspace
            </div>
          </div>
        </div>
        
      </div>


    </div>


  );
}
