"use client";

import Select from "react-select";
import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { ChevronDown, Folder, Plus } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { FiLayers } from "react-icons/fi";
import Link from "next/link";

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

interface Member {
  id: number;
  user?: number;
  role?: string;
  username?: string;
  name?: string;
  email?: string;
  experience?: number | null;
}

interface Project {
  id: number;
  name: string;
  billable: boolean;
  start_date?: string | null;
  end_date?: string | null;
  time_estimate?: number | null;
  budget_estimate?: number | null;
  notes?: string | null;
  members: string[]; // backend returns array of usernames in ProjectSerializer.to_representation
  tasks_count?: number;
  created_at?: string;
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("Active");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Form state for new project
  const [projectData, setProjectData] = useState({
    name: "",
    billable: false,
    start_date: "",
    end_date: "",
    time_estimate: 0,
    budget_estimate: 0,
    notes: "",
    members: [] as number[],
  });

  // Open/close modal
  const openModal = () => {
    setIsModalOpen(true);
    fetchMembersForModal();
  };
  const closeModal = () => setIsModalOpen(false);

  // Fetch visible projects with token authorization
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. User might not be authenticated.");
      return;
    }

    fetch(`${API_BASE_URL}/api/projects/`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: Project[]) => {
        setProjects(data);
      })
      .catch((err) => console.error("Error fetching projects:", err));
  }, []);

  // Fetch members for the modal dropdown (only those accepted invites created by this user)
  const fetchMembersForModal = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. User might not be authenticated.");
      return;
    }

    setIsLoadingMembers(true);
    try {
      // NOTE: we pass invited_by_me=1 to get only members that accepted invites created by this user
      const res = await fetch(`${API_BASE_URL}/api/members/?invited_by_me=1`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      });

      if (!res.ok) {
        // if 403/401, handle silently and show empty list
        console.error("Failed to fetch members:", res.status, res.statusText);
        setMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      const data: Member[] = await res.json();
      setMembers(data);
    } catch (err) {
      console.error("Error fetching members:", err);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Handle simple form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === "checkbox" ? target.checked : undefined;

    setProjectData((pd) => ({
      ...pd,
      [name]:
        type === "checkbox"
          ? checked
          : ["time_estimate", "budget_estimate"].includes(name)
          ? Number(value) || 0
          : value,
    }));
  };

  // Handle members multi-select change (react-select)
  const handleMembersChange = (opts: any) => {
    if (!opts) {
      setProjectData((pd) => ({ ...pd, members: [] }));
      return;
    }
    setProjectData((pd) => ({
      ...pd,
      members: opts.map((o: any) => o.value),
    }));
  };

  // Submit new project
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token"); // Retrieve the token

    if (!token) {
      console.error("No token found. User might not be authenticated.");
      return;
    }

    const payload = {
      ...projectData,
      members: projectData.members,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/createproject/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        closeModal();
        // Re-fetch projects
        const updated = await fetch(`${API_BASE_URL}/api/projects/`, {
          headers: {
            "Authorization": `Token ${token}`,
          },
        }).then((r) => {
          if (!r.ok) {
            console.error("Failed to re-fetch projects:", r.status, r.statusText);
            return [];
          }
          return r.json();
        });
        setProjects(updated);
        // reset form
        setProjectData({
          name: "",
          billable: false,
          start_date: "",
          end_date: "",
          time_estimate: 0,
          budget_estimate: 0,
          notes: "",
          members: [],
        });
      } else {
        const err = await res.json().catch(() => null);
        console.error("Failed to create project:", res.status, res.statusText, err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Build select options from members fetched from backend
  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.username || m.name || m.email || `Member#${m.id}`,
  }));

  return (
    <div className="p-9 w-full mx-auto rounded-xl ">
      <div className="flex justify-between tabContainer profile-settings-tabs-wrapper mb-4">
        <div className="d-flex um-btns-wrap">
          {["Active", "Inactive"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 tabButton py-2 ${
                activeTab === tab ? " active" : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center flex-wrap gap-3 ">
          <button className="g-btn d-flex align-items-center rounded-2" onClick={openModal}>
            <Plus size={16} className="mr-2" /> Create Project
          </button>

          <div className="relative">
            <button
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
              className="border rounded-2 bg-white flex items-center h-36 px-2"
            >
              Action <ChevronDown size={16} className="ml-2" />
            </button>
            {actionMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                <button className="block w-full px-4 py-2 text-left hover:bg-gray-100">
                  Sort Alphabetically
                </button>
                <button className="block w-full px-4 py-2 text-left hover:bg-gray-100">
                  Archive All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="border rounded-lg shadow-md overflow-hidden my-4">
        <table className="w-full g-table">
          <thead className="bg-[#9A4AFD] text-white">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Active Tasks</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Estimate Hours</th>
              <th className="px-4 py-3">Budget</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="bg-gray-50">
                <td className="px-4 py-3">
                  {p.name}
                  <br />
                  <Link href={`/dashboard/Task/${p.id}/addtasks`} className="text-blue-500">
                    Add New Tasks
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {p.members && p.members.length > 0 ? (
                    p.members.map((username) => (
                      <span
                        key={username}
                        className="bg-purple-100 px-3 py-1 text-purple-600 rounded-md inline-block m-1"
                      >
                        {username}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No Members</span>
                  )}
                </td>

                <td className="px-4 py-3">{p.tasks_count}</td>
                <td className="px-4 py-3 text-gray-500">{p.notes || "No Data"}</td>
                <td className="px-4 py-3">{p.time_estimate}</td>
                <td className="px-4 py-3">${p.budget_estimate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      <Dialog open={isModalOpen} onClose={closeModal} className="fixed inset-0 z-50 overflow-y-auto create-project-modal">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button onClick={closeModal}>
                <IoMdClose size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="mb-3">
                <label className="block mb-1">Project Name *</label>
                <div className="flex border rounded-lg p-2">
                  <FiLayers className="mr-2 text-gray-500" />
                  <input
                    type="text"
                    name="name"
                    className="w-full outline-none"
                    onChange={handleChange}
                    required
                    value={projectData.name}
                  />
                </div>
              </div>

              {/* Billable */}
              <div className="flex items-center mb-4">
                <input type="checkbox" name="billable" className="mr-2" onChange={handleChange} checked={projectData.billable} />
                <label>Billable</label>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="date" name="start_date" className="border rounded-lg p-2" onChange={handleChange} value={projectData.start_date} />
                <input type="date" name="end_date" className="border rounded-lg p-2" onChange={handleChange} value={projectData.end_date} />
              </div>

              {/* Estimates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" name="time_estimate" placeholder="Hours" className="border rounded-lg p-2" onChange={handleChange} value={projectData.time_estimate} />
                <input type="number" name="budget_estimate" placeholder="Budget" className="border rounded-lg p-2" onChange={handleChange} value={projectData.budget_estimate} />
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block mb-1">Notes</label>
                <textarea name="notes" rows={3} className="border rounded-lg p-2 w-full" onChange={handleChange} value={projectData.notes} />
              </div>

              {/* Members */}
              <div className="mb-4">
                <label className="block mb-1">Members</label>
                <Select isMulti options={memberOptions} onChange={handleMembersChange} isLoading={isLoadingMembers} />
              </div>

              {/* Buttons */}
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="g-btn-grey" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="g-btn h-36">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
}