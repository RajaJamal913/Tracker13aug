"use client";
export const dynamic = 'force-dynamic';
import Image from "next/image";
import "bootstrap/dist/css/bootstrap.min.css";
import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "react-bootstrap";
import { Legend } from "recharts";
import { useState } from "react";
import React from 'react';
import { Table, Form } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";
import { useRouter } from 'next/navigation'
import ProjectOverviewChart from '@/components/dbchart/ProjectOverviewChart';
import TeamProductivityChart from '@/components/dbchart/TeamProductivityChart';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
export default function Home() {
  const [username, setUsername] = useState<string>('Loading…')
  const router = useRouter()

  // Redirect unauthenticated users
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/user-login');
      return;
    }

    fetch('http://127.0.0.1:8000/api/auth/whoami/', {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => setUsername(data.username))
      .catch(() => {
        // If token invalid or fetch error, redirect to login
        router.push('/user-login');
      });
  }, [router]);


  // Compute current date & day:
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })          // e.g. "2 August 2025"
  const dayName = today.toLocaleDateString('en-US', {
    weekday: 'long',
  })          // e.g. "Saturday"



  const users = [
    { name: "Jenny Wilson", email: "w.lawson@example.com", time: "just now", location: "Austin", image: "/assets/images/recent-log.svg" },
    { name: "Devon Lane", email: "dat.roberts@example.com", time: "2 hr ago", location: "New York", image: "/assets/images/recent-log.svg" },
    { name: "Jane Cooper", email: "jgraham@example.com", time: "2 hr ago", location: "Toledo", image: "/assets/images/recent-log.svg" },
    { name: "Dianne Russell", email: "curtis.d@example.com", time: "1 hr ago", location: "Naperville", image: "/assets/images/recent-log.svg" },
  ];


  // for chart 
  const data = [
    { day: "Mon", value: 2, color: "#DCCEFF" },
    { day: "Tue", value: 8, color: "#DCCEFF" },
    { day: "Wed", value: 6, color: "#DCCEFF" },
    { day: "Thu", value: 4, color: "#DCCEFF" },
    { day: "Fri", value: 3, color: "#DCCEFF" },
    { day: "Sat", value: 5, color: "#DCCEFF" },
    { day: "Sun", value: 6, color: "#DCCEFF" },
  ];

  const invitemember = [
    {
      name: 'Invitation Sent',
      value: 3,
      fill: '#EB795F', // Blue color for "Invitation Sent"
    },
    {
      name: 'Accepted',
      value: 19,
      fill: '#FFBB58', // Green color for "Accepted"
    },
    {
      name: 'Logged In',
      value: 15,
      fill: '#00A982', // Orange color for "Logged In"
    },
    {
      name: 'Tracked Time',
      value: 15,
      fill: '#FE3A3C', // Red color for "Tracked Time"
    },
  ];




  const Invite_members = [
    { name: "Invitation Sent", value: 3, color: "#EB795F" },
    { name: "Accepted", value: 19, color: "#FFBB58" },
    { name: "Logged In", value: 15, color: "#00A982" },
    { name: "Tracked Time", value: 15, color: "#FE3A3C" },
  ];
  // for chart 


  // for members table 
  const membersData = [
    { rank: 1, name: "Hamza", team: "Development", accomplished: 98, inprogress: 120, activityHours: 45 },
    { rank: 2, name: "Ali", team: "QA", accomplished: 95, inprogress: 110, activityHours: 42 },
    { rank: 3, name: "Usman", team: "UX Design", accomplished: 92, inprogress: 105, activityHours: 40 },
    { rank: 4, name: "Anees", team: "SEO", accomplished: 90, inprogress: 98, activityHours: 38 },
    { rank: 5, name: "Azam", team: "Marketing", accomplished: 88, inprogress: 70, activityHours: 37 },
  ];

  const [search, setSearch] = useState("");

  const filteredMembers = membersData.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase())
  );

  // for members table 


  // for members activity table 

  const membersActivityData = [
    { projectname: "Design Homepage UI", assignedTo: "Hamza", techteam: "Backend", deadline: "12-6-25", priority: "High", status: "In Progress" },
    { projectname: "Backend API Development", assignedTo: "Usman", techteam: "Frontend", deadline: "12-6-25", priority: "High", status: "Not Started" },
    { projectname: "Bug Fixing (Login Issue)", assignedTo: "Ali", techteam: "QA", deadline: "12-6-25", priority: "Medium", status: "Completed" },
    { projectname: "Content Writing (Landing Page)", assignedTo: "Azam", techteam: "Marketing", deadline: "12-6-25", priority: "Low", status: "In Progress" },
    { projectname: "SEO Optimization", assignedTo: "Farhan", techteam: "Seo", deadline: "12-6-25", priority: "Medium", status: "Not Started" },
  ];

  const [searchProject, setsearchProject] = useState("");

  const filteredActivities = membersActivityData.filter((activity) =>
    activity.projectname.toLowerCase().includes(search.toLowerCase())
  );
  // for members activity table 

  const data2 = [
    { name: 'Mon', value: 2, color: '#F4B740' },   // Yellow
    { name: 'Tue', value: 8, color: '#00A86B' },   // Green
    { name: 'Wed', value: 6, color: '#E2C5FF' },   // Light Purple
    { name: 'Thu', value: 4, color: '#FF4B4B' },   // Red
    { name: 'Fri', value: 3, color: '#E9815A' },   // Coral
    { name: 'Sat', value: 5, color: '#5E2D92' },   // Dark Purple
    { name: 'Sun', value: 6, color: '#FFB946' },   // Orange
  ];


  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("Dropped files:", acceptedFiles);
    // Handle file upload logic here
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (<>

    <div className="container">
      <div className="row mt-4 mb-4">
        <div className="col-lg-12 mb-5 px-lg-3 px-0">
          <Card className="d-flex flex-row align-items-center p-3 border-0 rounded-3 g-shadow card_wrapper_bg_grad">
            <div
              className="d-flex align-items-center me-3 text-white rounded-3 justify-content-center d-sm-flex d-none"
              style={{ width: '50px', height: '50px', fontWeight: 'bold', fontSize: '18px', background: '#6D2EBB' }}
            >
              {username[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0">{username}</h6>
              <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                {username}’s Workplace
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                <i className="bi bi-person" /> Owner
              </p>
            </div> <div className="text-end">
              <p className="mb-0" style={{ fontSize: '14px' }}>{formattedDate}</p>
              <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>{dayName}</p>
            </div>
          </Card>
        </div>
      </div>
      <div className="card_wrapper_bg_grad px-4 pt-5 pb-3 mb-4">
        <div className="row">
          {[
            {
              src: "/assets/images/pm.svg",
              title: "Project Management",
              url: "/dashboard/Projects/Createproject"
            },
            {
              src: "/assets/images/tm.svg",
              title: "Smart Task Management",
              url: "/dashboard/MyTask"
            },
            {
              src: "/assets/images/rtm.svg",
              title: "Real-Time Monitoring",
              url: "/dashboard/member-monitoring"
            },
            {
              src: "/assets/images/um.svg",
              title: "User Management",
              url: "/dashboard/user-management"
            },
          ].map((item, index) => (
            <div key={index} className="col-lg-3 mb-4 px-lg-3 px-0 d-t-c">
              <a href={item.url} className="text-decoration-none">
                <div className="card dashboard-top-cards p-3 text-center">
                  <Image src={item.src} alt={item.title} width={50} height={50} />
                  <div className="card-body">
                    <h5 className="card-title">{item.title}</h5>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
      <div className="row db-home-sec-divide mb-4">
        <div className="col-lg-8 mb-4 px-lg-3 px-0">
          <TeamProductivityChart />
        </div>
        <div className="col-lg-4 mb-4 px-lg-3 px-0">
          <div className="card p-3 g-shadow border-0 rounded-3 text-white h-100" style={{ backgroundColor: "#A259FF" }}>
            <h6 className="fw-bold">Recent Login</h6>
            <p className="mb-3" style={{ fontSize: "14px" }}>Recent login details</p>
            <ul className="list-unstyled">
              {users.map((user, index) => (
                <li key={index} className="d-flex align-items-center mb-3">
                  <img src={user.image} alt={user.name} className="rounded-circle me-2" width="40" height="40" />
                  <div className="flex-grow-1">
                    <h6 className="mb-0 text-white" style={{ fontSize: "14px" }}>{user.name}</h6>
                    <p className="mb-0 text-white-50" style={{ fontSize: "12px" }}>{user.email}</p>
                  </div>
                  <div className="text-end">
                    <p className="mb-0 text-white" style={{ fontSize: "12px" }}>{user.time}</p>
                    <p className="mb-0 text-white-50" style={{ fontSize: "12px" }}>{user.location}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mb-0 fw-bold text-white-50" style={{ fontSize: "14px", cursor: "pointer" }}>SEE ALL &gt;</p>
          </div>
        </div>
      </div>


      <div className="row db-home-sec-divide mb-4">
        <div className="col-lg-12">
          <div className="row">
            <div className="col-lg-4 px-lg-3 px-0 mb-4">

              <Card className="d-flex justify-content-center g-shadow h-100 invite-member-card" >
                <Card.Body className="text-center">
                  {/* Header with Icon */}
                  <div className="d-flex justify-content-between align-items-center">
                    <Card.Title className="fw-bold">Invite New Members</Card.Title>
                    <div className="p-2 rounded-circle" style={{ boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", background: "#EDDFFE " }}>
                      <Image src="/assets/images/invite.svg" alt="" width={50} height={50} />
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p className="mt-2">Invite Members by Email or Link</p>

                  {/* Invite Button */}
                  <Button style={{ backgroundColor: "#A54EF5", border: "none", padding: "8px 16px", borderRadius: "6px" }}>
                    + Invite
                  </Button>
                </Card.Body>
              </Card>

            </div>
            <div className="col-lg-8 px-lg-3 px-0 mb-4">
              <div className="chart-container g-shadow p-4 rounded-4 bg-white">

                <h5 className="card-title mx-auto text-center mb-2">Project Overview</h5>

                <ProjectOverviewChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row db-home-sec-divide mb-4 px-3">
        <div className="col-lg-12">
          <div className=" row db-home-sec-divide mb-4 ">
            <div className="col-lg-12 mb-4 px-lg-3 px-0">
              <div className="d-flex align-items-center justify-content-between">
                <h4 className="fw-bold">Weekly Task Summary</h4>

                {/* Search Bar */}
                <Form.Control
                  type="text"
                  placeholder="Search members here"
                  className="mb-3 top-members-search g-shadow rounded-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

              </div>

              {/* Table */}
              <div className="table-responsive g-table-wrap g-t-scroll">
                <Table hover className="text-center g-table">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                      <th></th>
                      <th>Name</th>
                      <th>Team</th>
                      <th>Accomplished Task</th>
                      <th>In-Progress Task</th>
                      <th>Activity Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.rank} style={{ backgroundColor: "#F7ECFF" }}>
                        <td className="fw-bold">{member.rank}</td>
                        <td>{member.name}</td>
                        <td>{member.team}</td>
                        <td>{member.accomplished}</td>
                        <td>{member.inprogress}</td>

                        <td>{member.activityHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>

          </div>


          <div className="row db-home-sec-divide mb-4">
            <div className="col-lg-12 mb-4 px-lg-3 px-0">
              <div className="d-flex align-items-center justify-content-between">
                <h4 className="fw-bold">Project Overview</h4>

                {/* Search Bar */}
                <Form.Control
                  type="text"
                  placeholder="Search members here"
                  className="mb-3 top-members-search g-shadow rounded-10"
                  value={searchProject}
                  onChange={(e) => setsearchProject(e.target.value)}
                />

              </div>

              {/* Table */}
              <div className="table-responsive g-table-wrap g-t-scroll">
                <Table hover className="text-center g-table">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                      <th>Project Name</th>
                      <th>Assigned To</th>
                      <th>Tech Team</th>
                      <th>Deadline</th>
                      <th>Priority</th>
                      <th>Status</th>

                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((activity, index) => (
                      <tr key={index} style={{ backgroundColor: "#F7ECFF" }}>
                        <td>{activity.projectname}</td>
                        <td>{activity.assignedTo}</td>
                        <td>{activity.techteam}</td>
                        <td><span>{activity.deadline}</span></td>
                        <td>{activity.priority}</td>
                        <td>{activity.status}</td>

                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>


        </div>
      </div>

    </div>

  </>


  );
}