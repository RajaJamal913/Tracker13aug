'use client';
// This tells Next JS to never statically prerender this route
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { IoMdClose } from "react-icons/io";
import { jsPDF } from "jspdf";
import {
  Bell,
  Mail,
  Clock,
  ChevronDown,
  Plus,
  Edit,
  Folder,
  ListChecks,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const weekday = date.toLocaleString("en-US", { weekday: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday} ${day},${year}`;
}

function formatTime(timeString: string): string {
  const [hourStr, minuteStr] = timeString.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minuteStr} ${ampm}`;
}

function computeTimeDifference(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = eh * 3600 + em * 60 - (sh * 3600 + sm * 60);
  if (diff < 0) diff += 24 * 3600;
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

// Types
interface Project { id: number; name: string; }
interface Task { id: number; title: string; }
interface TimeEntry {
  id: number;
  project: string;
  task: string;
  date: string;
  start_time: string;
  end_time: string;
}

export default function TimeSheetPage() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateRange, setDateRange] = useState("Oct 15, 2024 - Oct 20, 2024");

  const [form, setForm] = useState({
    date: "",
    project_id: "",
    task_id: "",
    start_time: "",
    end_time: "",
    activity_description: "",
  });

  // Auth helpers
  function getToken() {
    return localStorage.getItem("token");
  }

  function authFetchOpts(method = "GET", body?: any): RequestInit {
    const token = getToken();
    if (!token) throw new Error("No auth token – user not logged in");
    const headers: Record<string,string> = {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };
    const init: RequestInit = { method, headers, credentials: "include" };
    if (body != null) init.body = JSON.stringify(body);
    return init;
  }

  // Load projects
  useEffect(() => {
    try {
      fetch("http://127.0.0.1:8000/api/projects/", authFetchOpts())
        .then((r) => r.json())
        .then(setProjects)
        .catch(console.error);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load entries
  const fetchEntries = () => {
    try {
      fetch("http://127.0.0.1:8000/api/addtime/", authFetchOpts())
        .then((r) => r.json())
        .then(setTimeEntries)
        .catch(console.error);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { fetchEntries(); }, [isModalOpen]);

  // Load tasks when project changes
  useEffect(() => {
    if (!form.project_id) return;
    try {
      fetch(
        `http://127.0.0.1:8000/api/tasks/?project=${form.project_id}`,
        authFetchOpts()
      )
        .then((r) => r.json())
        .then(setTasks)
        .catch(console.error);
    } catch (e) {
      console.error(e);
    }
  }, [form.project_id]);

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/addtime/",
        authFetchOpts("POST", payload)
      );
      if (!res.ok) console.error(await res.json());
      setIsModalOpen(false);
      setForm({ date: "", project_id: "", task_id: "", start_time: "", end_time: "", activity_description: "" });
      fetchEntries();
    } catch (e) { console.error(e); }
  };

  const exportCSV = () => {
    if (!timeEntries.length) return;
    const header = ["Date","Time","Project","Task","Total Time"];
    const rows = timeEntries.map(e => [
      formatDate(e.date),
      `${formatTime(e.start_time)} - ${formatTime(e.end_time)}`,
      e.project,
      e.task,
      computeTimeDifference(e.start_time, e.end_time),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "time_entries.csv"; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const exportPDF = () => {
    if (!timeEntries.length) return;
    const doc = new jsPDF(); let y = 20;
    doc.setFontSize(14).text("Time Entries", 14, 15);
    doc.setFontSize(10);
    ["Date","Time","Project","Task","Total Time"].forEach((h,i) => doc.text(h, 14+i*36, y));
    y += 7;
    timeEntries.forEach(e => {
      const cells = [
        formatDate(e.date),
        `${formatTime(e.start_time)} - ${formatTime(e.end_time)}`,
        e.project,
        e.task,
        computeTimeDifference(e.start_time, e.end_time),
      ];
      cells.forEach((c,i) => doc.text(c, 14+i*36, y));
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save("time_entries.pdf"); setExportOpen(false);
  };

  return (
    <>
   

      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div className="flex items-center gap-2">
          <Clock size={24} /> <h1 className="text-xl font-bold">Time Sheet</h1>
        </div>
        <div className="flex gap-4">
          <Bell size={24} className="cursor-pointer" />
          <Mail size={24} className="cursor-pointer" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 py-4 flex-wrap">
        <button  className="g-btn">
          <Folder size={16} className="mr-2" /> Projects
        </button>
        <button  className="g-btn">
          <ListChecks size={16} className="mr-2" /> Tasks
        </button>
        <button  className="g-btn">
          <Calendar size={16} className="mr-2" /> {dateRange}
          <ChevronDown size={16} className="ml-2" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-between py-4 flex-wrap gap-2">
        <button onClick={() => setIsModalOpen(true)} className="g-btn">
          <Plus size={16} className="mr-2" /> Add Time
        </button>
        <div className="flex gap-2">
          <button className="g-btn">
            <Edit size={16} className="mr-2" /> Edit
          </button>
          <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
            <DropdownMenuTrigger asChild>
              <button className="g-btn">
                Columns <ChevronDown size={16} className="ml-2" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom">
              <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap text-center text-base md:text-lg font-medium border rounded p-4 bg-gray-50 mb-4">
  
  <div className="w-1/2 sm:w-1/3 md:w-1/5 mb-4">
    <div>Total Time</div>
    <div className="text-gray-600">0:00</div>
  </div>

  
  <div className="w-1/2 sm:w-1/3 md:w-1/5 mb-4">
    <div>Amount Owed</div>
    <div className="text-gray-600">$0.00</div>
  </div>

  
  <div className="w-1/2 sm:w-1/3 md:w-1/5 mb-4">
    <div>Paid Leave</div>
    <div className="text-gray-600">0:00</div>
  </div>

  
  <div className="w-1/2 sm:w-1/3 md:w-1/5 mb-4">
    <div>Absent</div>
    <div className="text-gray-600">2</div>
  </div>

  
  <div className="w-1/2 sm:w-1/3 md:w-1/5 mb-4">
    <div>Holiday</div>
    <div className="text-gray-600">--</div>
  </div>
</div>

      {/* Entries Table */}
     

     
       <div className="shadow">
        <div className="table-responsive g-table-wrap g-t-scroll">
 <table className="w-full table g-table">
        <thead className="bg-purple-600 text-white">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Time</th>
            <th className="p-2">Project</th>
            <th className="p-2">Task</th>
            <th className="p-2">Total Time</th>
          </tr>
        </thead>
        <tbody>
          {timeEntries.length ? (
            timeEntries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{formatDate(e.date)}</td>
                <td className="p-2">
                  {formatTime(e.start_time)} - {formatTime(e.end_time)}
                </td>
                <td className="p-2">{e.project}</td>
                <td className="p-2">{e.task}</td>
                <td className="p-2">{computeTimeDifference(e.start_time, e.end_time)}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} className="p-4 text-center">No entries found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    </div>

     {/* Add Time Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="fixed inset-0 z-50 overflow-y-auto" style={{zIndex:"999"}}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" />
          <div className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <div className="flex justify-between items-center bg-purple-600 text-white px-4 py-2 rounded-t-xl">
              <h2 className="text-xl">Add Time</h2>
              <IoMdClose className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm">Project</label>
                <select
                  name="project_id"
                  value={form.project_id}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                >
                  <option value="">Select…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm">Task</label>
                <select
                  name="task_id"
                  value={form.task_id}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full border px-3 py-2 rounded"
                >
                  <option value="">Select…</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm">Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
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
                    value={form.end_time}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full border px-3 py-2 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm">Activity Description</label>
                <textarea
                  name="activity_description"
                  value={form.activity_description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full border px-3 py-2 rounded"
                />
              </div>
              <button type="submit" className="g-btn ms-auto">
                Add
              </button>
            </form>
          </div>
        </div>
      </Dialog>
    </>

  );
}
