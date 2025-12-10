"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { IoMdAdd } from "react-icons/io";
import {
  FaListUl,
  FaEye,
  FaUserAlt,
  FaChartBar,
  FaCalendarAlt,
  FaSave,
} from "react-icons/fa";
import Select from "react-select";
import { Button } from "@/components/ui/button";
import "bootstrap/dist/js/bootstrap.bundle.min";

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

type ApiTask = {
  id: number;
  sequence_id: number;
  project: number;
  assignee: number | null;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Member = { id: number; username: string };
type Project = { id: number; name: string };

// Utility to read CSRF token from cookie
function getCookie(name: string) {
  const matches = document.cookie.match(
    new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  );
  return matches ? matches[2] : '';
}

export default function AddTasksPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [projectName, setProjectName] = useState<string>("");
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    due_date: "",
    priority: "Normal",
    status: "OPEN",
    assignee: "",
  });
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(false);

  const statusOptions = ["OPEN", "IN_PROGRESS", "DONE", "CLOSED"];
  const priorityOptions = ["Low", "Normal", "High", "Urgent"];
  const csrftoken = getCookie('csrftoken');

  // Fetch project name & members
  useEffect(() => {
    // Projects
    fetch(`${API_BASE_URL}/api/projects/`, {
      credentials: "include",
      headers: { 'X-CSRFToken': csrftoken }
    })
      .then((r) => r.json())
      .then((plist: Project[]) => {
        const p = plist.find((x) => x.id === pid);
        if (p) setProjectName(p.name);
      })
      .catch(console.error);

    // Members
    fetch(`${API_BASE_URL}/api/projects/${pid}/members/`, {
      credentials: "include",
      headers: { 'X-CSRFToken': csrftoken }
    })
      .then((r) => r.json())
      .then((data: Member[]) => {
        const uniqueMembers = Array.from(new Map(data.map(m => [m.id, m])).values());
        setMembers(uniqueMembers);
      })
      .catch(console.error);
  }, [pid]);

  // Load tasks safely
  const loadTasks = async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/?project=${pid}`, {
        credentials: "include",
        headers: { 'X-CSRFToken': csrftoken }
      });
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json.results ?? [];
      setTasks(arr);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, [pid]);

  // Create new task
  const handleAdd = async () => {
    const payload = {
      project: pid,
      title: newTask.title,
      due_date: newTask.due_date || null,
      priority: newTask.priority,
      status: newTask.status,
      assignee: newTask.assignee ? Number(newTask.assignee) : null,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/create/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          'X-CSRFToken': csrftoken
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await res.json();
      setNewTask({ title: "", due_date: "", priority: "Normal", status: "OPEN", assignee: "" });
      await loadTasks();
      const mdl = document.getElementById("addTaskModal");
      mdl && (window as any).bootstrap.Modal.getInstance(mdl)?.hide();
    } catch (e) {
      console.error("Add failed", e);
    }
  };

  // Edit task
  const startEdit = (t: ApiTask) => setEditingTask(t);
  const cancelEdit = () => setEditingTask(null);
  const saveEdit = async () => {
    if (!editingTask) return;
    const { id, sequence_id, project, created_at, updated_at, ...body } = editingTask;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          'X-CSRFToken': csrftoken
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await res.json();
      setEditingTask(null);
      await loadTasks();
    } catch (e) {
      console.error("Edit failed", e);
    }
  };

  // Delete task
  const deleteTask = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { 'X-CSRFToken': csrftoken }
      });
      await loadTasks();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };
  return (
    <div className=" mt-4">
      {/* Add Task Modal */}
      <div className="modal fade" id="addTaskModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content p-4">
            <h5 className="mb-3">Add Task to "{projectName}"</h5>
            <input
              className="form-control mb-2"
              placeholder="Title"
              value={newTask.title}
              onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
            />
            <input
              type="date"
              className="form-control mb-2"
              value={newTask.due_date}
              onChange={(e) => setNewTask((t) => ({ ...t, due_date: e.target.value }))}
            />
            <select
              className="form-select mb-2"
              value={newTask.priority}
              onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))}
            >
              {priorityOptions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              className="form-select mb-2"
              value={newTask.status}
              onChange={(e) => setNewTask((t) => ({ ...t, status: e.target.value }))}
            >
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="form-select mb-2"
              value={newTask.assignee}
              onChange={(e) => setNewTask((t) => ({ ...t, assignee: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username}
                </option>
              ))}
            </select>
            <div className="d-flex justify-content-end gap-2">
              <button className="g-btn h-36 rounded-3" data-bs-dismiss="modal">
                Close
              </button>
              <button className="g-btn h-36 rounded-3" onClick={handleAdd}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="d-flex justify-content-end mb-4">
        {/* <h4 className="text-xl font-semibold flex items-center">
          <FaListUl className="mr-2" /> Tasks for {projectName || `#${pid}`}
        </h4> */}
        <button
          className="g-btn h-36 d-flex align-items-center rounded-3"
          data-bs-toggle="modal"
          data-bs-target="#addTaskModal"
        >
          <IoMdAdd className="mr-1" /> <span>Add Task</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading tasks…</p>
      ) : (
        <table className="w-full rounded g-table">
          <thead>
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(tasks) && tasks.length > 0 ? (
              tasks.map((t) => {
                const editing = editingTask?.id === t.id;
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3">{t.sequence_id}</td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          className="border rounded px-1 py-0.5 w-full"
                          value={editingTask!.title}
                          onChange={(e) =>
                            setEditingTask((et) => et && { ...et, title: e.target.value })
                          }
                        />
                      ) : (
                        t.title
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center">
                        {/* <img src="/assets/images/Calendar.png" alt="" /> */}

                      {editing ? (
                        <input
                          type="date"
                          className="border rounded px-1 py-0.5"
                          value={editingTask!.due_date || ""}
                          onChange={(e) =>
                            setEditingTask((et) => et && { ...et, due_date: e.target.value })
                          }
                        />
                      ) : t.due_date ? (
                        t.due_date
                      ) : (
                        <FaCalendarAlt />
                      )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          className="border rounded px-1 py-0.5"
                          value={editingTask!.priority}
                          onChange={(e) =>
                            setEditingTask((et) => et && { ...et, priority: e.target.value })
                          }
                        >
                          {priorityOptions.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        t.priority
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          className="border rounded px-1 py-0.5"
                          value={editingTask!.status}
                          onChange={(e) =>
                            setEditingTask((et) => et && { ...et, status: e.target.value })
                          }
                        >
                          {statusOptions.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        t.status
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          className="border rounded px-1 py-0.5"
                          value={String(editingTask!.assignee || "")}
                          onChange={(e) =>
                            setEditingTask((et) =>
                              et ? { ...et, assignee: Number(e.target.value) } : et
                            )
                          }
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.username}
                            </option>
                          ))}
                        </select>
                      ) : (
                        members.find((m) => m.id === t.assignee)?.username || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      {editing ? (
                        <div className="d-flex gap-3">
                          <button
                            className="g-btn h-36 text-white px-4 py-3 rounded"
                            onClick={saveEdit}
                          >
                            <FaSave size={12} />
                          </button>
                          <button
                            className="g-btn h-36 text-white px-4 py-3 rounded"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex gap-3">
                          <button
                            className="bg-blue-500 text-white px-4 py-3 rounded h-36 d-flex align-items-center"
                            onClick={() => startEdit(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-red-500 text-white px-4 py-3 rounded h-36 d-flex align-items-center"
                            onClick={() => deleteTask(t.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  No tasks to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <style>
{
  `     .modal-backdrop.fade.show{
    display: none !important;
}
  `
}
   
      </style>
    </div>
);
}