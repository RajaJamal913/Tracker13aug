"use client";
import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Dropdown } from "primereact/dropdown";

const PROJECT_TYPES = {
  WEB: "Web",
  MOBILE: "Mobile",
  BOTH: "Both",
};

const priorityOptions = ["High", "Medium", "Low"].map((p) => ({
  label: p,
  value: p,
}));

const projectTypeOptions = [
  { label: "Web", value: PROJECT_TYPES.WEB },
  { label: "Mobile", value: PROJECT_TYPES.MOBILE },
  { label: "Both", value: PROJECT_TYPES.BOTH },
];

const projectOptions = [
  { label: "Project A", value: "Project A" },
  { label: "Project B", value: "Project B" },
  { label: "Project C", value: "Project C" },
];

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

const CreateTaskModal = () => {
  const [show, setShow] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // form states
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<any>(null);
  const [showFigma, setShowFigma] = useState(false);
  const [webDesc, setWebDesc] = useState("");
  const [mobileDesc, setMobileDesc] = useState("");
  const [figmaDesc, setFigmaDesc] = useState("");
  const [priority, setPriority] = useState<any>(null);
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = () => {
    const newTask = {
      selectedProject,
      title,
      projectType,
      webDesc,
      mobileDesc,
      figmaDesc,
      priority,
      deadline,
      hours,
      tags,
    };
    setTasks([...tasks, newTask]);

    // reset form
    setSelectedProject(null);
    setTitle("");
    setProjectType(null);
    setWebDesc("");
    setMobileDesc("");
    setFigmaDesc("");
    setPriority(null);
    setDeadline("");
    setHours(0);
    setTags([]);
    setShowFigma(false);
    setShow(false);
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setTags([...tags, tag]);
    } else {
      setTags(tags.filter((t) => t !== tag));
    }
  };

  return (
    <div className="container py-4">
      {/* Button */}
      <Button variant="primary" onClick={() => setShow(true)}>
        Create New Task
      </Button>

      {/* Modal */}
      <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row">
            {/* Select Project */}
            <div className="col-md-4 mb-3">
              <Form.Label>Select Project</Form.Label>
              <Dropdown
                value={selectedProject}
                options={projectOptions}
                onChange={(e) => setSelectedProject(e.value)}
                placeholder="Select"
                className="w-100"
              />
            </div>

            {/* Title */}
            <div className="col-md-4 mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Project Type */}
            <div className="col-md-4 mb-3">
              <Form.Label>Select Project Type</Form.Label>
              <Dropdown
                value={projectType}
                options={projectTypeOptions}
                onChange={(e) => setProjectType(e.value)}
                placeholder="Select a Project Type"
                className="w-100"
              />

              <Form.Check
                type="checkbox"
                label="Figma Design"
                className="mt-2"
                checked={showFigma}
                onChange={(e) => setShowFigma(e.target.checked)}
              />
            </div>

            {/* Web Modules */}
            {(projectType === PROJECT_TYPES.WEB ||
              projectType === PROJECT_TYPES.BOTH) && (
              <div className="col-md-6 mb-3">
                <Form.Label>Web Modules Description</Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="Enter web modules description"
                  value={webDesc}
                  onChange={(e) => setWebDesc(e.target.value)}
                />
              </div>
            )}

            {/* Mobile Modules */}
            {(projectType === PROJECT_TYPES.MOBILE ||
              projectType === PROJECT_TYPES.BOTH) && (
              <div className="col-md-6 mb-3">
                <Form.Label>Mobile Modules Description</Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="Enter mobile modules description"
                  value={mobileDesc}
                  onChange={(e) => setMobileDesc(e.target.value)}
                />
              </div>
            )}

            {/* Figma Modules */}
            {showFigma && (
              <div className="col-md-6 mb-3">
                <Form.Label>Figma Modules Description</Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="Enter figma modules description"
                  value={figmaDesc}
                  onChange={(e) => setFigmaDesc(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="row">
            {/* Priority */}
            <div className="col-md-6 mb-3">
              <Form.Label>Priority</Form.Label>
              <Dropdown
                value={priority}
                options={priorityOptions}
                onChange={(e) => setPriority(e.value)}
                placeholder="Select Priority"
                className="w-100"
              />
            </div>

            {/* Deadline */}
            <div className="col-md-6 mb-3">
              <Form.Label>Deadline</Form.Label>
              <Form.Control
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* Hours */}
            <div className="col-md-6 mb-3">
              <Form.Label>Estimated Hours</Form.Label>
              <Form.Control
                type="number"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <Form.Label>Tags</Form.Label>
            <div className="row">
              {allTags.map((tag) => (
                <div className="col-md-4" key={tag}>
                  <Form.Check
                    type="checkbox"
                    label={tag}
                    checked={tags.includes(tag)}
                    onChange={(e) => handleTagChange(tag, e.target.checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Create Task
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Table Preview */}
      {tasks.length > 0 && (
        <div className="mt-5">
          <h4>Tasks Preview</h4>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Project</th>
                <th>Title</th>
                <th>Project Type</th>
                <th>Web Desc</th>
                <th>Mobile Desc</th>
                <th>Figma Desc</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Hours</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={idx}>
                  <td>{t.selectedProject}</td>
                  <td>{t.title}</td>
                  <td>{t.projectType}</td>
                  <td>{t.webDesc}</td>
                  <td>{t.mobileDesc}</td>
                  <td>{t.figmaDesc}</td>
                  <td>{t.priority}</td>
                  <td>{t.deadline}</td>
                  <td>{t.hours}</td>
                  <td>{t.tags.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreateTaskModal;
