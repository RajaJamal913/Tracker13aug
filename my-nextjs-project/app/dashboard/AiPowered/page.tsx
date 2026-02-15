"use client";

import TeamRiskHeatmap from "@/components/TeamRiskHeatmap";
import UserAnalyticsChart from "@/components/UserAnalyticsChart";
import Home from "@/components/prodChart";
import React, { useState, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";

// Use same API base as ProjectsPage
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const API_BASE = `${API_BASE_URL}/api`;

interface Project {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  members?: string[];
  tasks_count?: number;
  time_estimate?: number | null;
  budget_estimate?: number | null;
}

export default function AIPowered() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) {
        headers["Authorization"] = token.startsWith("Token ") || token.startsWith("Bearer ") ? token : `Token ${token}`;
      }

      console.debug("AiPowered: GET", `${API_BASE}/projects/`, "headers", headers);
      const res = await fetch(`${API_BASE}/projects/`, { method: "GET", headers, credentials: "include" });
      if (!res.ok) {
        console.warn("AiPowered: projects fetch failed", res.status, res.statusText);
        setProjects([]);
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => null);
      console.debug("AiPowered: projects payload", data);

      const arr: any[] = Array.isArray(data) ? data : (data?.results ?? []);
      const normalized: Project[] = arr.map((p: any) => ({
        id: p.id,
        name: p.name,
        start_date: p.start_date ?? p.start,
        end_date: p.end_date ?? p.end,
        notes: p.notes,
        members: p.members ?? [],
        tasks_count: p.tasks_count ?? 0,
        time_estimate: p.time_estimate ?? null,
        budget_estimate: p.budget_estimate ?? null,
      }));
      setProjects(normalized);
    } catch (err) {
      console.error("AiPowered: error fetching projects", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  // parse date string (YYYY-MM-DD or ISO) to Date (date-only)
  function parseDateString(s?: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const parts = s.split("-").map((x) => parseInt(x, 10));
    if (parts.length >= 3 && parts.every((n) => !isNaN(n))) return new Date(parts[0], parts[1] - 1, parts[2]);
    return null;
  }
  function daysBetween(from: Date, to: Date) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const utc1 = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const utc2 = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.floor((utc2 - utc1) / msPerDay);
  }

  function onProjectSelect(p: Project | null) {
    setSelectedProject(p);
    setActionMsg(null);
    if (!p || !p.end_date) {
      setShowExtendModal(false);
      return;
    }
    const end = parseDateString(p.end_date);
    if (!end) {
      setShowExtendModal(false);
      return;
    }
    const diff = daysBetween(new Date(), end);
    setShowExtendModal(diff < 0);
  }

  async function extendDeadline(project: Project, days: number, fromOriginal = false) {
    if (!project) return;
    setActionMsg(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers["Authorization"] = token.startsWith("Token ") || token.startsWith("Bearer ") ? token : `Token ${token}`;

      let base = new Date();
      if (fromOriginal && project.end_date) {
        const orig = parseDateString(project.end_date);
        if (orig) base = orig;
      }
      const newDate = new Date(base);
      newDate.setDate(newDate.getDate() + Math.max(1, Math.floor(days)));

      const yyyy = newDate.getFullYear();
      const mm = String(newDate.getMonth() + 1).padStart(2, "0");
      const dd = String(newDate.getDate()).padStart(2, "0");
      const payload = { end_date: `${yyyy}-${mm}-${dd}` };

      setActionMsg("Updating deadline...");
      const res = await fetch(`${API_BASE}/projects/${project.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(`Update failed (${res.status}) ${errBody?.detail ?? ""}`);
      }
      const updated = await res.json().catch(() => null);
      setProjects((prev) => prev.map((x) => (x.id === updated.id ? { ...x, end_date: updated.end_date ?? x.end_date } : x)));
      setSelectedProject((prev) => (prev && prev.id === updated.id ? { ...prev, end_date: updated.end_date ?? prev.end_date } : prev));
      setActionMsg("Deadline updated successfully.");
      setShowExtendModal(false);
    } catch (err: any) {
      console.error("Failed to update deadline:", err);
      setActionMsg(err.message || "Failed to update");
    }
  }

  function renderDeadlineStatus(p: Project | null) {
    if (!p) return null;
    const end = parseDateString(p.end_date);
    if (!end) return <div className="text-muted">No deadline set</div>;
    const today = new Date();
    const diff = daysBetween(today, end);
    if (diff < 0) {
      return <div className="text-danger">Delayed by {Math.abs(diff)} day{Math.abs(diff) !== 1 ? "s" : ""}</div>;
    }
    return <div className="text-success">{diff} day{diff !== 1 ? "s" : ""} remaining • Due {end.toLocaleDateString()}</div>;
  }

  // use up to 4 cards (keeps grid/visual like your original)
  const cards = projects.length ? projects.slice(0, 4) : Array.from({ length: 4 }).map(() => null);

  return (
    <div className="container-fluid pb-5 py-4">
      <div className="row mb-4">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">AI Powered Productivitys</h2>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center justify-content-between">
              <div className="flex-grow-1 me-3">
                <Dropdown
                  inputId="project-select"
                  value={selectedProject}
                  onChange={(e) => onProjectSelect(e.value)}
                  options={projects}
                  optionLabel="name"
                  placeholder={loading ? "Loading projects..." : "Choose a project..."}
                  className="w-100"
                  filter
                  showClear
                  panelClassName="shadow-lg border-0"
                />
                 {/* {selectedProject && (
                <div className="text-end">
                  <div className="text-muted small">Selected Project</div>
                  <div className="fw-bold text-dark">{selectedProject.name}</div>
                  <div className="small mt-1">{renderDeadlineStatus(selectedProject)}</div>
                </div>
              )} */}
              </div>
             
            </div>
            <button className="btn g-btn">View Specific Members Productivity</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-4 g-border p-6 h-100 mb-4 mt-4">
        <div className="row g-4">
          {cards.map((p, idx) => (
            <div key={idx} className="col-lg-6">
              <div className="card g-border ai-pp-cards">
                <div className="card-body p-4">
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="ic-wrapper">
                          <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9.9475 10.7252C9.9475 11.301 10.4142 11.7677 10.99 11.7677C11.5657 11.7677 12.0324 11.301 12.0324 10.7252V7.5978C12.0324 7.02207 11.5657 6.55533 10.99 6.55533C10.4142 6.55533 9.9475 7.02207 9.9475 7.5978V10.7252ZM12.0324 13.8409C12.0324 13.2652 11.5657 12.7985 10.99 12.7985C10.4142 12.7985 9.9475 13.2652 9.9475 13.8409V13.8526C9.9475 14.4284 10.4142 14.8951 10.99 14.8951C11.5657 14.8951 12.0324 14.4284 12.0324 13.8526V13.8409ZM8.25594 2.03243C9.44753 -0.112374 12.5321 -0.112374 13.7236 2.03243L20.605 14.4188C21.763 16.5033 20.2556 19.065 17.8711 19.065H4.10847C1.72387 19.065 0.216562 16.5033 1.37462 14.4188L8.25594 2.03243Z" fill="#CC4444" />
                          </svg>
                        </div>
                        <h4 className="fw-medium mb-1">{p ? p.name : "Website Design"}</h4>
                      </div>

                      <div className="d-flex align-items-center gap-2 delay-info-wrapper">
                        <div className="ic-wrapper">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.97656 4.24414V5.74414" stroke="#323232" strokeLinecap="round" />
                            <path d="M4.97656 7.24388V7.23828" stroke="#323232" strokeLinecap="round" />
                            <path d="M4.10356 1.81807L0.803062 7.75892C0.432767 8.42547 0.914737 9.24457 1.67722 9.24457H8.27821C9.04066 9.24457 9.52266 8.42547 9.15236 7.75892L5.85186 1.81807C5.47086 1.13226 4.48456 1.13226 4.10356 1.81807Z" stroke="#323232" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        {/* dynamic deadline/status */}
                        <div className="text-muted mb-0 delay-info">
                          {p ? (
                            (() => {
                              const end = parseDateString(p.end_date);
                              if (!end) return "No deadline set";
                              const diff = daysBetween(new Date(), end);
                              if (diff < 0) return `Delayed by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""}`;
                              return `${diff} day${diff !== 1 ? "s" : ""} remaining • Due ${end.toLocaleDateString()}`;
                            })()
                          ) : (
                            "Delayed by 3 days"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="badge bg-danger me-2" style={{ width: "fit-content" }}>Help Risk</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-lg-6">
          <TeamRiskHeatmap />
        </div>
        <div className="col-lg-6">
          <Home />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-12">
          <UserAnalyticsChart />
        </div>
      </div>

      {/* Overdue modal — same behavior */}
      {showExtendModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-3 p-4 w-full max-w-md">
            <h5 className="mb-2">Project "{selectedProject.name}" is overdue</h5>
            <p className="text-muted mb-3">How many days ahead would you like to extend the deadline?</p>

            <div className="d-flex gap-2 mb-3">
              <input type="number" min={1} value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value || "0", 10))} className="form-control" />
              <button className="btn g-btn" onClick={() => extendDeadline(selectedProject, Math.max(1, Number(extendDays || 1)))}>Extend</button>
              <button className="btn btn-outline-secondary" onClick={() => extendDeadline(selectedProject, Math.max(1, Number(extendDays || 1)), true)}>Extend from original</button>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-link" onClick={() => setShowExtendModal(false)}>Cancel</button>
            </div>

            {actionMsg && <div className="mt-2 small">{actionMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
