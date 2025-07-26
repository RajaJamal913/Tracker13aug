// components/AddTimeModal.js
'use client';

import React, { useState } from 'react';
import { MultiSelect } from 'primereact/multiselect';

const AddTimeModal = () => {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const projects = [
    { name: 'Project A', code: 'A' },
    { name: 'Project B', code: 'B' },
  ];

  const tasks = [
    { name: 'Task 1', code: 'T1' },
    { name: 'Task 2', code: 'T2' },
  ];

  return (
    <>
      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTimeModal">
        Open Add Time Modal
      </button>

      <div className="modal fade" id="addTimeModal" tabIndex={-1} aria-labelledby="addTimeModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content rounded-4 p-4" style={{ backgroundColor: '#f9e7fd' }}>
            <div className="modal-header border-0">
              <h5 className="modal-title" id="addTimeModalLabel">Add Time</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input type="text" className="form-control" placeholder="Enter Name" />
              </div>

              <div className="mb-3">
                <label className="form-label">Add Project</label>
                <MultiSelect
                  value={selectedProject}
                  options={projects}
                  onChange={(e) => setSelectedProject(e.value)}
                  optionLabel="name"
                  placeholder="Select Project"
                  className="w-100"
                  filter
                />
                <div className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" value="" id="applyCheckbox" />
                  <label className="form-check-label" htmlFor="applyCheckbox">
                    Apply to newly added members, too
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Add Task</label>
                <MultiSelect
                  value={selectedTasks}
                  options={tasks}
                  onChange={(e) => setSelectedTasks(e.value)}
                  optionLabel="name"
                  placeholder="Select Task"
                  className="w-100"
                  filter
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Date</label>
                <input type="date" className="form-control" />
              </div>

              <div className="mb-3 row">
                <div className="col">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-control" />
                </div>
                <div className="col d-flex align-items-end justify-content-center">
                  <span>to</span>
                </div>
                <div className="col">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-control" />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Activity Description</label>
                <textarea className="form-control" rows={3} placeholder="Describe the activity..."></textarea>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary">Add</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTimeModal;