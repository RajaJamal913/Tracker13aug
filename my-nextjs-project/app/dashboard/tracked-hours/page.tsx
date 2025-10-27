"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import FilterMultiSelects, { FilterPayload } from "@/components/FilterMultiSelects";

type ApiMemberRow = {
  member_id?: number | null;
  member_name?: string | null;
  total_seconds: number;
};

type ApiProjectResponse = {
  project_id: number;
  project_name?: string | null;
  total_seconds: number;
  members?: ApiMemberRow[]; // present on new owner responses
};

type FlatReportItem = {
  date: string;
  member: string;
  project_id: number;
  project_name: string;
  hour: string;
  total_seconds: number;
};

type GroupedProject = {
  project_id: number;
  project_name: string;
  total_seconds: number;
  members: ApiMemberRow[];
};

export default function TimeRequestTabs() {
  const [groups, setGroups] = useState<GroupedProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterPayload>({
    memberIds: [],
    projectIds: [],
    teams: [],
    date: null,
  });

  const [showZeroMembers, setShowZeroMembers] = useState<boolean>(true);

  const API_BASE = "http://127.0.0.1:8000/api";

  // callback passed to FilterMultiSelects
  const handleFilterChange = useCallback((payload: FilterPayload) => {
    setFilters(payload);
  }, []);

  const buildQuery = (f: FilterPayload) => {
    const params = new URLSearchParams();
    if (f.memberIds && f.memberIds.length > 0) params.set("members", f.memberIds.join(","));
    if (f.projectIds && f.projectIds.length > 0) params.set("projects", f.projectIds.join(","));
    if (f.teams && f.teams.length > 0) params.set("teams", f.teams.join(","));
    if (f.date) {
      const y = f.date.getFullYear();
      const m = String(f.date.getMonth() + 1).padStart(2, "0");
      const d = String(f.date.getDate()).padStart(2, "0");
      params.set("date", `${y}-${m}-${d}`);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Normalize server response to GroupedProject[]
  const normalizeResponse = (raw: any): GroupedProject[] => {
    // Grouped format detection: objects with members array
    if (Array.isArray(raw) && raw.length > 0 && raw[0] && typeof raw[0] === "object") {
      const arr = raw as any[];

      const hasMembersArray = arr.some((x) => Array.isArray(x.members));
      // If grouped format
      if (hasMembersArray) {
        const grouped = arr.map((p: ApiProjectResponse) => ({
          project_id: Number(p.project_id),
          project_name: p.project_name ?? `Project #${p.project_id}`,
          total_seconds: Number(p.total_seconds || 0),
          members:
            Array.isArray(p.members) && p.members.length > 0
              ? p.members.map((m) => ({
                  member_id: m.member_id ?? null,
                  member_name: m.member_name ?? (m.member_id ? `#${m.member_id}` : "Unknown"),
                  total_seconds: Number(m.total_seconds || 0),
                }))
              : [],
        })) as GroupedProject[];
        return grouped;
      }

      // Flat rows detection: objects with project_id and member fields
      const looksLikeFlat = arr.every((x) => "project_id" in x && ("member" in x || "member_name" in x));
      if (looksLikeFlat) {
        const map = new Map<number, GroupedProject>();
        for (const r of arr as FlatReportItem[]) {
          const pid = Number(r.project_id);
          const pname = r.project_name ?? `Project #${pid}`;
          const secs = Number(r.total_seconds || 0);

          if (!map.has(pid)) {
            map.set(pid, {
              project_id: pid,
              project_name: pname,
              total_seconds: secs,
              members: [],
            });
          }

          const group = map.get(pid)!;
          // If backend returned multiple rows for same project with different members, keep them
          group.members.push({
            member_id: null,
            member_name: r.member,
            total_seconds: secs,
          });

          // ensure project total_seconds is set - if server provided aggregated value
          group.total_seconds = Math.max(group.total_seconds || 0, secs);
        }

        // Optionally compute project totals as sum of members if you prefer:
        const results = Array.from(map.values()).map((g) => ({
          ...g,
          total_seconds:
            g.total_seconds && g.total_seconds > 0
              ? g.total_seconds
              : g.members.reduce((s, m) => s + (m.total_seconds || 0), 0),
        }));
        return results;
      }
    }

    // If empty or unexpected format, return empty
    return [];
  };

  // Fetch reports when filters change
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Not authenticated");
        }
        const qs = buildQuery(filters);
        const res = await fetch(`${API_BASE}/reports/tracked-hours/${qs}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load report");
        }
        const data = await res.json();
        const normalized = normalizeResponse(data);
        if (!cancelled) setGroups(normalized);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Export currently visible rows to CSV (project + members)
  const exportCSV = () => {
    if (!groups || groups.length === 0) return;
    const rows: string[][] = [["Project", "Member", "Member seconds", "Member hours formatted", "Project total seconds", "Project total formatted"]];
    for (const g of groups) {
      if (!g.members || g.members.length === 0) {
        rows.push([g.project_name, "", String(g.total_seconds ?? 0), formatHours(Number(g.total_seconds ?? 0)), "", ""]);
        continue;
      }
      for (const m of g.members) {
        if (!showZeroMembers && (m.total_seconds ?? 0) === 0) continue;
        rows.push([
          g.project_name,
          m.member_name ?? "",
          String(m.total_seconds ?? 0),
          formatHours(Number(m.total_seconds ?? 0)),
          String(g.total_seconds ?? 0),
          formatHours(Number(g.total_seconds ?? 0)),
        ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracked-hours-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">Tracked Hours</h2>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <button className="btn g-btn" onClick={exportCSV}>Export</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={showZeroMembers}
                onChange={(e) => setShowZeroMembers(e.target.checked)}
              />
              <span>Show zero-hour members</span>
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-start mb-4">
        <FilterMultiSelects onFilterChange={handleFilterChange} />
      </div>

      {loading ? (
        <p>Loading report...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : groups.length === 0 ? (
        <p>No tracked hours found for selected filters.</p>
      ) : (
        <div className="table-responsive g-table-wrap g-t-scroll">
          <h1 className="table-heading">Tracked Hours Report</h1>
          <table className="w-full table g-table">
            <thead>
              <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                <th>Project</th>
                <th>Member</th>
                <th>Member Hours</th>
                <th>Project Total</th>
              </tr>
            </thead>

            {/* single valid tbody with only tr children */}
            <tbody>
              {groups.map((g) => {
                // Build rows: project header row + member rows
                const rows: JSX.Element[] = [];

                // Project header row
                rows.push(
                  <tr key={`project-${g.project_id}`} style={{ backgroundColor: "#E9D7FF" }}>
                    <td className="px-4 py-3 font-semibold">{g.project_name}</td>
                    <td className="px-4 py-3"> — </td>
                    <td className="px-4 py-3"> — </td>
                    <td className="px-4 py-3 font-semibold">{formatHours(g.total_seconds ?? 0)}</td>
                  </tr>
                );

                // Member rows (if any)
                if (g.members && g.members.length > 0) {
                  const filteredMembers = showZeroMembers ? g.members : g.members.filter((m) => (m.total_seconds ?? 0) > 0);
                  if (filteredMembers.length === 0) {
                    rows.push(
                      <tr key={`project-${g.project_id}-no-members`} style={{ backgroundColor: "#F7ECFF" }}>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-gray-500">No member entries</td>
                        <td className="px-4 py-3">0h 0m</td>
                        <td className="px-4 py-3" />
                      </tr>
                    );
                  } else {
                    filteredMembers.forEach((m, idx) => {
                      rows.push(
                        <tr key={`project-${g.project_id}-member-${m.member_id ?? m.member_name ?? idx}`} style={{ backgroundColor: "#F7ECFF" }}>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3">{m.member_name}</td>
                          <td className="px-4 py-3">{formatHours(Number(m.total_seconds ?? 0))}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      );
                    });
                  }
                } else {
                  // No members array at all
                  rows.push(
                    <tr key={`project-${g.project_id}-no-members2`} style={{ backgroundColor: "#F7ECFF" }}>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-gray-500">No member entries</td>
                      <td className="px-4 py-3">0h 0m</td>
                      <td className="px-4 py-3" />
                    </tr>
                  );
                }

                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
