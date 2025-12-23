'use client';

import React, { JSX, useEffect, useState } from 'react';
import { Table, Spinner, Form } from 'react-bootstrap';
import 'react-datepicker/dist/react-datepicker.css';

type MaybeObj<T> = T | number | string;
type UserObj = { id: number; username?: string; is_staff?: boolean };

type TimeRequest = {
  id: number;
  project: MaybeObj<{ id: number; name?: string; created_by?: MaybeObj<UserObj> }>;
  project_owner?: number | null;
  task: MaybeObj<{ id: number; title?: string }>;
  date?: string | null;
  time_from?: string | null;
  time_to?: string | null;
  requested_duration?: string | null;
  description?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  is_creator?: boolean;
  can_approve?: boolean;
  can_delete?: boolean;
  user?: MaybeObj<UserObj> | string | number;
  user_id?: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';

function getCookie(name: string) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(^|;)\\s*${name}=\\s*([^;]+)`));
  return match ? match[2] : '';
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('token') || '';
  if (!raw) return null;
  return raw.replace(/^"|"$/g, '');
}

function getAuthOptions() {
  const token = readToken();
  const csrftoken = getCookie('csrftoken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
    return { headers } as const;
  }
  if (csrftoken) {
    headers['X-CSRFToken'] = csrftoken;
  }
  return { headers, credentials: 'include' as const };
}

function buildApi(path: string) {
  return `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export default function TimeTrackerPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<TimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [projectsCache, setProjectsCache] = useState<Record<number, { id: number; name?: string }>>({});
  const [tasksCache, setTasksCache] = useState<Record<number, { id: number; title?: string }>>({});

  const getProjectName = (r: TimeRequest) => {
    const p = r.project;
    if (p === null || typeof p === 'undefined') return '—';
    if (typeof p === 'object') return (p as any).name ?? '—';
    const id = Number(p);
    return projectsCache[id]?.name ?? String(id);
  };

  const getTaskTitle = (r: TimeRequest) => {
    const t = r.task;
    if (t === null || typeof t === 'undefined') return '—';
    if (typeof t === 'object') return (t as any).title ?? '—';
    const id = Number(t);
    return tasksCache[id]?.title ?? String(id);
  };

  useEffect(() => {
    let mounted = true;
    const loadApproved = async () => {
      setLoading(true);
      setErrorText(null);
      try {
        const opts = getAuthOptions();

        // Build URL with status query param safely
        const urlString = new URL(buildApi('time-requests/'));
        urlString.searchParams.set('status', 'APPROVED');

        const res = await fetch(urlString.toString(), {
          method: 'GET',
          ...opts,
        });

        // If non-OK, read text for diagnostics (may be HTML from Django debug)
        if (!res.ok) {
          const txt = await res.text();
          const trimmed = txt.length > 4000 ? txt.slice(0, 4000) + '... (truncated)' : txt;
          throw new Error(`HTTP ${res.status}: ${trimmed}`);
        }

        const json = await res.json();
        const rawList: TimeRequest[] = Array.isArray(json) ? json : json.results ?? [];

        // DEFENSIVE: ensure only APPROVED entries are used, because some backends ignore the query param
        const approvedList = rawList.filter((r) => (r.status ?? '').toString().toUpperCase() === 'APPROVED');

        if (!mounted) return;
        setRequests(approvedList);

        // Gather numeric ids for missing details
        const numericTaskIds = Array.from(
          new Set(
            approvedList
              .map((r) => (typeof r.task === 'number' ? (r.task as number) : null))
              .filter((id): id is number => id !== null && !(id in tasksCache))
          )
        );

        const numericProjectIds = Array.from(
          new Set(
            approvedList
              .map((r) => (typeof r.project === 'number' ? (r.project as number) : null))
              .filter((id): id is number => id !== null && !(id in projectsCache))
          )
        );

        const fetchBulkOrIndividual = async <T extends { id: number }>(
          ids: number[],
          bulkPath: string,
          individualPathFn: (id: number) => string
        ): Promise<T[]> => {
          if (!ids.length) return [];
          try {
            // Try conventional bulk endpoint ?ids=1,2
            const bulkUrl = buildApi(`${bulkPath}?ids=${ids.join(',')}`);
            const r = await fetch(bulkUrl, { method: 'GET', ...opts });
            if (r.ok) {
              const j = await r.json();
              return Array.isArray(j) ? j : j.results ?? [];
            }
            // fallback: individual fetches
            const fetches = ids.map((id) =>
              fetch(buildApi(individualPathFn(id)), { method: 'GET', ...opts }).then(async (r2) => {
                if (!r2.ok) throw new Error(`fetch ${individualPathFn(id)} failed ${r2.status}`);
                return r2.json();
              })
            );
            return await Promise.all(fetches);
          } catch (err) {
            console.warn('bulk/individual fetch failed', err);
            return [];
          }
        };

        // Fetch missing tasks
        if (numericTaskIds.length > 0) {
          const tasksFetched = await fetchBulkOrIndividual<{ id: number; title?: string }>(
            numericTaskIds,
            'tasks',
            (id) => `tasks/${id}/`
          );
          if (mounted && tasksFetched.length > 0) {
            setTasksCache((prev) => {
              const copy = { ...prev };
              tasksFetched.forEach((t) => {
                if (t?.id) copy[t.id] = t;
              });
              return copy;
            });
          }
        }

        // Fetch missing projects
        if (numericProjectIds.length > 0) {
          const projectsFetched = await fetchBulkOrIndividual<{ id: number; name?: string }>(
            numericProjectIds,
            'projects',
            (id) => `projects/${id}/`
          );
          if (mounted && projectsFetched.length > 0) {
            setProjectsCache((prev) => {
              const copy = { ...prev };
              projectsFetched.forEach((p) => {
                if (p?.id) copy[p.id] = p;
              });
              return copy;
            });
          }
        }
      } catch (err: any) {
        console.error('Failed loading approved time requests', err);
        if (mounted) setErrorText(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadApproved();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = requests.filter((r) => getProjectName(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container py-3">
      <div className="row mb-3">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">Approved Time Requests</h2>
          <div style={{ minWidth: 240 }}>
            <Form.Control placeholder="Search by project" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="table-responsive g-table-wrap">
        <Table hover className="text-center g-table min-w-10">
          <thead>
            <tr className="text-start" style={{ backgroundColor: '#A54EF5' }}>
              <th>#</th>
              <th>Project</th>
              <th>Task</th>
              <th>Date</th>
              <th>Time From</th>
              <th>Time To</th>
              <th>Duration</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-3">
                  <Spinner animation="border" size="sm" /> Loading...
                </td>
              </tr>
            ) : errorText ? (
              <tr>
                <td colSpan={8} className="text-start text-danger py-3" style={{ whiteSpace: 'pre-wrap' }}>
                  {errorText}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-3">
                  No approved requests found
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.id} className="text-start" style={{ backgroundColor: '#F7ECFF' }}>
                  <td>{idx + 1}</td>
                  <td className="fw-bold">{getProjectName(r)}</td>
                  <td>{getTaskTitle(r)}</td>
                  <td>{r.date ?? '—'}</td>
                  <td>{(r.time_from ?? '').slice(0, 5) || '—'}</td>
                  <td>{(r.time_to ?? '').slice(0, 5) || '—'}</td>
                  <td>{r.requested_duration ?? '—'}</td>
                  <td title={r.description ?? ''}>
                    {(r.description ?? '').length > 40 ? (r.description ?? '').slice(0, 40) + '...' : r.description ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
