"use client";

import Select from "react-select";
import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { ChevronDown, Folder, Plus } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { FiLayers } from "react-icons/fi";
import Link from "next/link";

interface Member {
  id: number;
  user: number;
  role: string;
  username: string;
}

interface Project {
  id: number;
  name: string;
  billable: boolean;
  start_date: string;
  end_date: string;
  time_estimate: number;
  budget_estimate: number;
  notes: string;
  members: string[];      // Array of usernames
  tasks_count: number;    // Provided by backend
  created_at: string;
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab]         = useState("Active");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [projects, setProjects]           = useState<Project[]>([]);
  const [members, setMembers]             = useState<Member[]>([]);

  // Open/close modal
  const openModal  = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Fetch members list for the modal dropdown
   // Fetch members with token authorization
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. User might not be authenticated.");
      return;
    }

    fetch("http://127.0.0.1:8000/api/members/", {
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
      .then((data: Member[]) => {
        setMembers(data);
      })
      .catch((err) => console.error("Error fetching members:", err));
  }, []);

  // Fetch visible projects with token authorization
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. User might not be authenticated.");
      return;
    }

    fetch("http://127.0.0.1:8000/api/projects/", {
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

  // Handle simple fields
  // build change 
  // const handleChange = (
  //   e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  // ) => {
  //   const { name, value, type, checked } = e.target;
  //   setProjectData(pd => ({
  //     ...pd,
  //     [name]: type === "checkbox"
  //       ? checked
  //       : ["time_estimate", "budget_estimate"].includes(name)
  //         ? Number(value) || 0
  //         : value,
  //   }));
  // };
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const target = e.target as HTMLInputElement;
  const { name, value, type } = target;
  const checked = type === 'checkbox' ? target.checked : undefined;
  
  setProjectData(pd => ({
    ...pd,
    [name]: type === "checkbox"
      ? checked
      : ["time_estimate", "budget_estimate"].includes(name)
        ? Number(value) || 0
        : value,
  }));
};

// build change 
interface SelectOption {
  value: number;
  label: string;
}


  // Handle members multi‐select
  const handleMembersChange = (opts: any) => {
    setProjectData(pd => ({
      ...pd,
      members: opts.map((o: any) => o.value),
    }));
  };

  // Submit new project
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('token'); // Retrieve the token

  if (!token) {
    console.error("No token found. User might not be authenticated.");
    return;
  }

  const payload = {
    ...projectData,
    members: projectData.members,
  };

  try {
    const res = await fetch("http://127.0.0.1:8000/api/createproject/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${token}`, // Include the token in the header
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      closeModal();
      // Re-fetch projects
      const updated = await fetch("http://127.0.0.1:8000/api/projects/", {
        headers: {
          "Authorization": `Token ${token}`, // Include the token here as well
        },
      }).then(r => r.json());
      setProjects(updated);
    } else {
      console.error("Failed to create project:", await res.json());
    }
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="p-9 w-full mx-auto rounded-xl ">
      {/* Header */}
      {/* <div className="flex items-center justify-between pb-4 ">
        <h1 className="text-xl font-semibold flex items-center">
          <Folder size={30} className="mr-2" /> Projects
        </h1>
      </div> */}

      {/* Tabs & Actions */}
      <div className="flex justify-between tabContainer profile-settings-tabs-wrapper mb-4">
        <div className="d-flex um-btns-wrap">
          {["Active", "Inactive"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 tabButton py-2 ${
                activeTab === tab
                  ? " active"
                  : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center flex-wrap gap-3 ">
          <button
            className="g-btn d-flex align-items-center rounded-2"
            onClick={openModal}
          >
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
            {projects.map(p => (
              <tr key={p.id} className="bg-gray-50">
                <td className="px-4 py-3">
                  {p.name}
                  <br />
                  <Link href={`/dashboard/Task/${p.id}/addtasks`} className="text-blue-500">
                    Add New Tasks
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {p.members.length > 0 ? (
                    p.members.map(username => (
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
                  />
                </div>
              </div>

              {/* Billable */}
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="billable"
                  className="mr-2"
                  onChange={handleChange}
                />
                <label>Billable</label>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                  type="date"
                  name="start_date"
                  className="border rounded-lg p-2"
                  onChange={handleChange}
                />
                <input
                  type="date"
                  name="end_date"
                  className="border rounded-lg p-2"
                  onChange={handleChange}
                />
              </div>

              {/* Estimates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                  type="number"
                  name="time_estimate"
                  placeholder="Hours"
                  className="border rounded-lg p-2"
                  onChange={handleChange}
                />
                <input
                  type="number"
                  name="budget_estimate"
                  placeholder="Budget"
                  className="border rounded-lg p-2"
                  onChange={handleChange}
                />
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="border rounded-lg p-2 w-full"
                  onChange={handleChange}
                />
              </div>

              {/* Members */}
              <div className="mb-4">
                <label className="block mb-1">Members</label>
                <Select
                  isMulti
                  options={members.map(m => ({
                    value: m.id,
                    label: m.username,
                  }))}
                  onChange={handleMembersChange}
                />
              </div>

              {/* Buttons */}
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="g-btn-grey"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="g-btn h-36"
                >
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
