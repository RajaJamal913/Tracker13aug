"use client";

import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const TaskModal = () => {
  const [visible, setVisible] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignee, setAssignee] = useState("");
const [hours, setHours] = useState<string>(""); 
const [deadline, setDeadline] = useState<string>(""); 
  const [tags, setTags] = useState<string[]>([]);

  const priorities = ["Low", "Medium", "High"];
  const assignees = ["Hamza", "Sara", "Ali", "John"];

  const allTags = [
    "Design",
    "UI/UX",
    "Frontend",
    "Backend",
    "DevOps",
    "Security",
    "API",
    "Testing",
    "Review",
    "Planning",
    "Authentication",
    "Management",
  ];

  const handleTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setTags((prev) => [...prev, tag]);
    } else {
      setTags((prev) => prev.filter((t) => t !== tag));
    }
  };

  const handleSubmit = () => {
 const newTask = {
  title,
  description,
  priority,
  assignee,
  deadline,
  hours: Number(hours) || 0, // ✅ convert to number safely
  tags,
};


    setTasks([...tasks, newTask]);

    // reset form
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignee("");
    setDeadline("");
   setHours("0");  
    setTags([]);

    setVisible(false);
  };

  return (
    <div className="p-4">
      <Button label="Create New Task" icon="pi pi-plus" onClick={() => setVisible(true)} />

      <Dialog
      className="border-0 rounded-4 g-shadow g-modal-conntent-wrapper"
        header="Create New Task"
        visible={visible}
       
        onHide={() => setVisible(false)}
      >
        <div className="flex flex-col gap-3 py-1">
          <span className="p-float-label">
            <InputText
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
            <label>Title</label>
          </span>

          <span className="p-float-label">
            <InputTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
            <label>Description</label>
          </span>

          <div className="grid grid-cols-2 gap-3">
            <Dropdown
              value={priority}
              options={priorities}
              onChange={(e) => setPriority(e.value)}
              placeholder="Select Priority"
              className="w-full"
            />

            <Dropdown
              value={assignee}
              options={assignees}
              onChange={(e) => setAssignee(e.value)}
              placeholder="Select Assignee"
              className="w-full"
            />
          </div>

    <div className="grid grid-cols-2 gap-3">
  {/* Deadline */}
  <div className="flex flex-col">
    <label className="mb-1 font-medium">Deadline</label>
    <input
      type="date"
      value={deadline}
      onChange={(e) => setDeadline(e.target.value)}
      className="w-full border rounded p-2"
    />
  </div>

  {/* Estimated Hours */}
  <div className="flex flex-col">
    <label className="mb-1 font-medium">Estimated Hours</label>
    <input
      type="text"
      value={hours}
      onChange={(e) => setHours(e.target.value)}
      className="w-full border rounded p-2"
      placeholder="Enter hours"
    />
  </div>
</div>

          {/* ✅ Tags checkboxes instead of ReactTags */}
          <div>
            <label className="block mb-2 font-medium">Tags</label>
            <div className="grid grid-cols-3 gap-2">
              {allTags.map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={(e) => handleTagChange(tag, e.target.checked)}
                  />
                  <label>{tag}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button
              label="Cancel"
              className="p-button-secondary"
              onClick={() => setVisible(false)}
            />
            <Button label="Create Task" onClick={handleSubmit} />
          </div>
        </div>
      </Dialog>

      {/* Table to Preview Submitted Tasks */}
      {tasks.length > 0 && (
        <div className="mt-6">
  <div className="table-responsive g-table-wrap g-t-scroll">
          <h3 className="font-bold mb-2">Tasks Preview</h3>

          <table className="table g-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2">Title</th>
                <th className="border px-3 py-2">Assignee</th>
                <th className="border px-3 py-2">Priority</th>
                <th className="border px-3 py-2">Deadline</th>
                <th className="border px-3 py-2">Hours</th>
                <th className="border px-3 py-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i}>
                  <td className="border px-3 py-2">{t.title}</td>
                  <td className="border px-3 py-2">{t.assignee}</td>
                  <td className="border px-3 py-2">{t.priority}</td>
                  <td className="border px-3 py-2">{t.deadline}</td>
                  <td className="border px-3 py-2">{t.hours}</td>
                  <td className="border px-3 py-2">{t.tags.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
};

export default TaskModal;
