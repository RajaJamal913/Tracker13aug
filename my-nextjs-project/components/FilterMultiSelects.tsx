"use client";

import React, { useEffect, useState } from "react";
import { MultiSelect } from "primereact/multiselect";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type Option = { id?: number; name: string };

export type FilterPayload = {
  memberIds: number[];    // ids of selected members
  projectIds: number[];   // ids of selected projects
  teams: string[];        // selected team names
  date: Date | null;      // selected date
};

type Props = {
  onFilterChange?: (payload: FilterPayload) => void;
  apiBase?: string; // optional override
};

export default function FilterMultiSelects({ onFilterChange, apiBase }: Props) {
  const API_BASE = apiBase ?? "http://127.0.0.1:8000/api";

  const [selectedMembers, setSelectedMembers] = useState<Option[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Option[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Option[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [membersOptions, setMembersOptions] = useState<Option[]>([]);
  const [projectsOptions, setProjectsOptions] = useState<Option[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // static teams as example — you can fetch teams similarly if needed
  const teams = [
    "Development Team",
    "Project Management",
    "Designing Team",
  ].map((name) => ({ name }));

  // Fetch members once
  useEffect(() => {
    const controller = new AbortController();
    async function loadMembers() {
      const token = localStorage.getItem("token");
      if (!token) return;
      setLoadingMembers(true);
      try {
        const res = await fetch(`${API_BASE}/members/`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((m: any) => {
          if (typeof m === "string") return { name: m };
          const name =
            m.username ?? m.name ?? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
          return { id: m.id, name };
        });
        setMembersOptions(mapped);
      } catch (err) {
        if ((err as any).name !== "AbortError") console.error("members fetch:", err);
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
    return () => controller.abort();
  }, [API_BASE]);

  // Fetch projects once
  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      const token = localStorage.getItem("token");
      if (!token) return;
      setLoadingProjects(true);
      try {
        const res = await fetch(`${API_BASE}/projects/`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((p: any) => {
          if (typeof p === "string") return { name: p };
          const name = p.name ?? p.title ?? `Project #${p.id ?? ""}`;
          return { id: p.id, name };
        });
        setProjectsOptions(mapped);
      } catch (err) {
        if ((err as any).name !== "AbortError") console.error("projects fetch:", err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
    return () => controller.abort();
  }, [API_BASE]);

  // notify parent whenever filters change
  useEffect(() => {
    if (!onFilterChange) return;
    const payload: FilterPayload = {
      memberIds: selectedMembers.map((s) => s.id!).filter(Boolean),
      projectIds: selectedProjects.map((s) => s.id!).filter(Boolean),
      teams: selectedTeams.map((t) => t.name),
      date: selectedDate,
    };
    onFilterChange(payload);
    // calling on every change is fine; parent should debounce/fetch as needed
  }, [selectedMembers, selectedProjects, selectedTeams, selectedDate, onFilterChange]);

  return (
    <div className="filter-wrapper">
      <div style={{ minWidth: 220 }}>
        <MultiSelect
          value={selectedMembers}
          options={membersOptions}
          onChange={(e) => setSelectedMembers(e.value ?? [])}
          optionLabel="name"
          placeholder={loadingMembers ? "Loading members..." : "Members"}
          display="chip"
          filter
          className="filter-dropdown"
        />
      </div>

      <div style={{ minWidth: 220 }}>
        <MultiSelect
          value={selectedProjects}
          options={projectsOptions}
          onChange={(e) => setSelectedProjects(e.value ?? [])}
          optionLabel="name"
          placeholder={loadingProjects ? "Loading projects..." : "Projects"}
          display="chip"
          filter
          className="filter-dropdown"
        />
      </div>

      <div style={{ minWidth: 220 }}>
        <MultiSelect
          value={selectedTeams}
          options={teams}
          onChange={(e) => setSelectedTeams(e.value ?? [])}
          optionLabel="name"
          placeholder="Teams"
          display="chip"
          filter
          className="filter-dropdown"
        />
      </div>

      <DatePicker
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
        dateFormat="MMMM d, yyyy"
        placeholderText="Choose a date"
        className="form-control custom-datepicker"
      />

      <style jsx>{`
        .filter-wrapper {
          display: flex;
          gap: 1rem;
          padding: 1rem 0px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-dropdown {
          min-width: 220px;
        }

        :global(.p-multiselect-label) {
          font-size: 0.9rem;
        }

        :global(.p-multiselect-panel) {
          padding: 0.5rem;
        }

        .custom-datepicker {
          min-width: 220px;
        }
      `}</style>
    </div>
  );
}
