// 'use client';
// import React, { useState } from 'react';
// import { MultiSelect } from 'primereact/multiselect';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'primereact/resources/themes/lara-light-indigo/theme.css';
// import 'primereact/resources/primereact.min.css';
// import 'primeicons/primeicons.css';
// import 'primereact/resources/themes/lara-light-indigo/theme.css'; 
// import 'primereact/resources/primereact.min.css'; 
// import 'primeicons/primeicons.css'; 
'use client';
import React, { useState } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';  

const roles = [
  { name: 'Owner', code: 'owner' },
  { name: 'Executive Manager', code: 'executive_manager' },
  { name: 'Team Manager', code: 'team_manager' },
  { name: 'Project Manager', code: 'project_manager' },
  { name: 'Employee', code: 'employee' },
];

export default function TimesheetSettings() {
  const [editRoles, setEditRoles] = useState([roles[0], roles[1], roles[2], roles[3]]);
  const [approveRoles, setApproveRoles] = useState([]);

  const handleSave = () => {
    console.log('Edit Time Roles:', editRoles);
    console.log('Approve Timesheets Roles:', approveRoles);
  };

  return (
    <div className="container py-5">
      <div className="card shadow rounded-3">
        <div className="card-header g-theme-bg text-white">
          <h5 className="mb-0">Timesheets</h5>
        </div>
        <div className="card-body">
          {/* Edit Time Section */}
          <div className="mb-4">
            <label className="fw-semibold">Who can edit time</label>
            <p className="text-muted small">
              Selected roles can edit time without having to request. Non-selected will have to request.
            </p>
            <MultiSelect
              value={editRoles}
              options={roles}
              onChange={(e) => setEditRoles(e.value)}
              optionLabel="name"
              display="chip"
              placeholder={`${editRoles.length > 0 ? `${editRoles.length} Selected` : 'Select roles'}`}
              className="w-100"
              showSelectAll={false}
              filter
              maxSelectedLabels={3}
            />
          </div>

          {/* Approve Timesheets Section */}
          <div className="mb-4">
            <label className="fw-semibold">Who can approve timesheets?</label>
            <p className="text-muted small">
              Selected roles can approve and reject submitted timesheets.
            </p>
            <MultiSelect
              value={approveRoles}
              options={roles}
              onChange={(e) => setApproveRoles(e.value)}
              optionLabel="name"
              display="chip"
              placeholder="Select roles"
              className="w-100"
              showSelectAll={false}
              filter
              maxSelectedLabels={3}
            />
          </div>

          {/* Save Button */}
          <div className="text-end">
            <button className="btn g-btn px-4" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
