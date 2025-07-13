"use client";

import React, { useState, useEffect } from "react";
import { MultiSelect } from "primereact/multiselect";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

interface Role {
  name: string;
  code: string;
}
// build change 
// export default function TimesheetSettings(): JSX.Element {
export default function TimesheetSettings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [approveRoles, setApproveRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Auth helper
  const getToken = (): string | null => {
    return localStorage.getItem("token");
  };

  const authFetchOpts = (method = "GET", body?: any): RequestInit => {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };
    const opts: RequestInit = { method, headers, credentials: "include" };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return opts;
  };

  useEffect(() => {
    // Only project owner role
    const owner: Role = { code: 'owner', name: 'Owner' };
    setRoles([owner]);
    setEditRoles([owner]);
    setApproveRoles([]);
    setLoading(false);
  }, []);

  const handleSave = async (): Promise<void> => {
    const payload = {
      edit_roles: editRoles.map(r => r.code),
      approve_roles: approveRoles.map(r => r.code),
    };
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/settings/timesheet/1/",
        authFetchOpts("PATCH", payload)
      );
      if (res.ok) {
        alert('Settings saved successfully');
      } else {
        console.error(await res.json());
        alert('Failed to save settings');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    }
  };

  if (loading) {
    return <div className="p-5 text-center">Loading roles…</div>;
  }

  return (
    <div className="container-fluid py-5">
      <div className="card shadow rounded-3">
        <div className="card-header g-theme-bg text-white">
          <h5 className="mb-0">Timesheet Settings</h5>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <label className="fw-semibold">Who can edit time</label>
            <p className="text-muted small">
              Selected roles can edit timesheets directly.
            </p>
            <MultiSelect
              value={editRoles}
              options={roles}
              onChange={e => setEditRoles(e.value)}
              optionLabel="name"
              display="chip"
              placeholder={
                editRoles.length > 0
                  ? `${editRoles.length} Selected`
                  : 'Select roles'
              }
              className="w-100"
              filter
            />
          </div>
          <div className="mb-4">
            <label className="fw-semibold">Who can approve timesheets</label>
            <p className="text-muted small">
              Selected roles can approve and reject timesheets.
            </p>
            <MultiSelect
              value={approveRoles}
              options={roles}
              onChange={e => setApproveRoles(e.value)}
              optionLabel="name"
              display="chip"
              placeholder={
                approveRoles.length > 0
                  ? `${approveRoles.length} Selected`
                  : 'Select roles'
              }
              className="w-100"
              filter
            />
          </div>
          <div className="text-end">
            <button
              type="button"
              className="btn g-btn px-4"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
