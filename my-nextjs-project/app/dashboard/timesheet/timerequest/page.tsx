'use client';
// This tells Next JS to never statically prerender this route
export const dynamic = 'force-dynamic';


import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Folder, Briefcase, Type, Plus, XCircle, CheckCircle } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { IoMdClose } from "react-icons/io";

// Types
interface TimeRequest {
  id: number;
  member_name: string;
  project_name: string;
  start_time: string;
  end_time: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}
interface Member { id: number; username: string; }
interface Project { id: number; name: string; }

export default function TimeRequestHeader() {
  const [selectedTab, setSelectedTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [requests, setRequests] = useState<TimeRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newRequest, setNewRequest] = useState({
    member_id: "",
    project_id: "",
    start_time: "",
    end_time: "",
    date: "",
  });

  // Auth helpers
  function getToken() {
    return localStorage.getItem("token");
  }
  function authFetchOpts(method = "GET", body?: any): RequestInit {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");
    const headers: Record<string,string> = { "Content-Type": "application/json", Authorization: `Token ${token}` };
    const opts: RequestInit = { method, headers, credentials: "include" };
    if (body) opts.body = JSON.stringify(body);
    return opts;
  }

  // Fetch requests by status
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/timerequests/?status=${selectedTab}`,
          authFetchOpts()
        );
        const data: TimeRequest[] = await res.json();
        setRequests(data);
      } catch (e) { console.error(e); }
    }
    load();
  }, [selectedTab]);

  // Fetch members & projects
  useEffect(() => {
    async function loadMeta() {
      try {
        const [mRes, pRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/members/", authFetchOpts()),
          fetch("http://127.0.0.1:8000/api/projects/", authFetchOpts()),
        ]);
        const mData: Member[] = await mRes.json();
        const pData: Project[] = await pRes.json();
        setMembers(mData);
        setProjects(pData);
      } catch (e) { console.error(e); }
    }
    loadMeta();
  }, []);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewRequest((f) => ({ ...f, [name]: value }));
  };

  // Submit new request
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/timerequests/",
        authFetchOpts("POST", { ...newRequest, status: "pending" })
      );
      if (res.ok) {
        setIsModalOpen(false);
        setNewRequest({ member_id: "", project_id: "", start_time: "", end_time: "", date: "" });
        // Refresh pending
        setSelectedTab("pending");
      } else {
        console.error(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  // Update status
  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/timerequests/${id}/`,
        authFetchOpts("PATCH", { status })
      );
      if (res.ok) setRequests((r) => r.filter((req) => req.id !== id));
      else console.error(await res.json());
    } catch (e) { console.error(e); }
  };

  // Render
  return (
    <>

    <div className="container">
      <div className="flex items-center justify-between py-4 flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center">
          <Calendar size={20} className="mr-2" /> Time Request
        </h2>
        <button
          className="g-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2" /> Add Time
        </button>
      </div>

      <Tabs
        defaultValue="pending"
        onValueChange={(val) => setSelectedTab(val as any)}
        className="mb-4  tabContainer profile-settings-tabs-wrapper d-flex align-items-start"
      >
        <TabsList className="d-flex um-btns-wrap m-0 p-0 h-auto" style={{border:"3px solid #8e44ec"}}>
          <TabsTrigger
            value="pending"
            className={selectedTab === "pending" ? "tabButton active border-0" : "tabButton border-0"}
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className={selectedTab === "approved" ? "active" : "tabButton border-0"}
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className={selectedTab === "rejected" ? "active" : "tabButton border-0"}
          >
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap py-2">
        <button className="g-btn"><Users className="mr-2" /> Members</button>
        <button className="g-btn"><Folder className="mr-2" /> Projects</button>
        <button className="g-btn"><Briefcase className="mr-2" /> Teams</button>
        <button className="g-btn"><Type className="mr-2" /> Titles</button>
        <button className="g-btn">
          <Calendar className="mr-2 g-btn" /> {new Date().toLocaleDateString()}
        </button>
      </div>

 
<div className="w-full mx-auto bg-white rounded-xl shadow-md">
        {/* Table */}
      <div className="overflow-hidden table-responsive g-table-wrap g-t-scroll">
        <table className="w-full table g-table">
          <thead>
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Project</th>
              <th className="p-3">Requested Time</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-center">
                {selectedTab === "pending"
                  ? "Actions"
                  : selectedTab === "approved"
                  ? "Approved"
                  : "Rejected"}
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-b bg-purple-200 hover:bg-gray-200">
                <td className="p-3 font-semibold">{req.member_name}</td>
                <td className="p-3 font-semibold">{req.project_name}</td>
                <td className="p-3 font-semibold">{req.start_time} - {req.end_time}</td>
                <td className="p-3 font-semibold">{req.date}</td>
                <td className="p-3 text-center space-x-3">
                  {selectedTab === "pending" && (
                    <>
                      <button onClick={() => updateStatus(req.id, "approved")} className="text-green-600 hover:text-green-800" title="Approve">
                        <CheckCircle />
                      </button>
                      <button onClick={() => updateStatus(req.id, "rejected")} className="text-red-600 hover:text-red-800" title="Reject">
                        <XCircle />
                      </button>
                    </>
                  )}
                  {selectedTab === "approved" && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full">Approved</span>
                  )}
                  {selectedTab === "rejected" && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full">Rejected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
    </div>


      {/* Add Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b">
              <Dialog.Title className="text-xl font-bold">Add Time Request</Dialog.Title>
              <IoMdClose
                className="cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => setIsModalOpen(false)}
              />
            </div>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm">Member Name</label>
                <select
                  name="member_id"
                  value={newRequest.member_id}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Project Assigned</label>
                <select
                  name="project_id"
                  value={newRequest.project_id}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm">Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={newRequest.start_time}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full border px-3 py-2 rounded"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm">End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={newRequest.end_time}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full border px-3 py-2 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm">Date</label>
                <input
                  type="date"
                  name="date"
                  value={newRequest.date}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#9A4AFD] text-white py-2 rounded-lg hover:bg-purple-600"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
    
        </>
  );
}
