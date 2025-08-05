"use client";
export const dynamic = 'force-dynamic';

import NextDynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

interface ReportItem {
  date: string;
  member: string;
  project_id: number;
  project_name: string;
  hour: string;
  total_seconds: number;
}

export default function TrackedHoursPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamically import FilterMultiSelects on client only
  const FilterMultiSelects = NextDynamic(
    () => import('@/components/FilterMultiSelects'),
    { ssr: false }
  );

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetch('http://127.0.0.1:8000/api/reports/tracked-hours/', {
      headers: { Authorization: `Token ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load report');
        return res.json();
      })
      .then((data: ReportItem[]) => setReports(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (loading) return <p>Loading report...</p>;
  if (error)   return <p className="text-danger">{error}</p>;

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">Tracked Hours</h2>
          <button className="btn g-btn">Export</button>
        </div>
      </div>

      <div className="d-flex justify-content-start mb-4">
        <FilterMultiSelects />
      </div>

      <div className="table-responsive g-table-wrap g-t-scroll">
        <h1 className="table-heading">Tracked Hours Report</h1>
        <table className="w-full table g-table">
          <thead>
            <tr className="text-white" style={{ backgroundColor: '#A54EF5' }}>
              <th>Date</th>
              <th>Members</th>
              <th>Project</th>
              <th>Hours</th>
              <th>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, idx) => (
              <tr key={idx} style={{ backgroundColor: '#F7ECFF' }}>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">{r.member}</td>
                <td className="px-4 py-3">{r.project_name}</td>
                <td className="px-4 py-3">{r.hour}</td>
                <td className="px-4 py-3">{formatHours(r.total_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
