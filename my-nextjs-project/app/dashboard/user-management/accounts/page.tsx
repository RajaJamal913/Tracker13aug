"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, Table, Form, Button } from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface Project {
  id: number;
  name: string;
  created_by: string;
  members: any[];
  tasks_count: number;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token);
    if (!token) {
      const msg = "No token found. User might not be authenticated.";
      console.error(msg);
      setError(msg);
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/projects/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        console.log("Raw response:", res);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: Project[]) => {
        console.log("Parsed project data:", data);
        setProjects(data);
      })
      .catch((err: Error) => {
        console.error("Error fetching projects:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center mt-5">Loading projects...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-5">Error: {error}</div>;
  }

  if (projects.length === 0) {
    return <div className="text-center mt-5">No projects found.</div>;
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        {projects.map((proj) => (
          <div key={proj.id} className="col-lg-6 mb-5">
            <Card className="workspace-card ws-2 ">
              <Card.Body className="workspace-card-inner p-0">
                <div className="d-flex justify-content-between flex-wrap gap-1 mb-4">
                  <p className="workspace-role mb-3">
                    <Image
                      src="/assets/images/profile-img.jpg"
                      alt="Owner"
                      width={20}
                      height={20}
                    />
                    <span className="fw-bold ms-2 text-end">Owner</span>
                  </p>
                  <h6 className="mb-1">{proj.created_by}</h6>
                </div>
                <div className="d-flex justify-content-between flex-wrap gap-1 mb-4">
                  <span>Project Title</span>
                  <strong className="text-dark text-end">{proj.name}</strong>
                </div>
                <div className="d-flex justify-content-between flex-wrap gap-1 mb-4">
                  <span>No of Members</span>
                  <strong className="text-dark text-end">{proj.members.length}</strong>
                </div>
                <div className="d-flex justify-content-between flex-wrap gap-1 mb-4">
                  <span>No of Tasks</span>
                  <strong className="text-dark text-end">{proj.tasks_count}</strong>
                </div>
                <button className="g-btn mt-3">
                  
                  Leave Workplace
                </button>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}