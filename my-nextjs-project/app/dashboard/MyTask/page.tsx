'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';

interface Task {
  id: number;
  project_id?: number | null;
  project?: { id?: number; name?: string; title?: string } | number | null;
  project_name?: string | null;
  assignee?: number | null;
  title?: string;
  due_date?: string | null;
  deadline?: string | null;
  due?: string | null;
  assigned_at?: string | null;
  priority?: string | null;
  created_at?: string;
  updated_at?: string;
  tasks_count?: number;
  [key: string]: any;
}

interface ProjectMap {
  [id: number]: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function MyTaskPage() {
  const [humanTasks, setHumanTasks] = useState<Task[]>([]);
  const [aiTasks, setAiTasks] = useState<Task[]>([]);
  const [projectNames, setProjectNames] = useState<ProjectMap>({});
  const [loading, setLoading] = useState(true);

  const [humanError, setHumanError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const load = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setGeneralError('You must be logged in to view your tasks.');
        setLoading(false);
        return;
      }

      const humanUrl = `${API_BASE_URL}/api/tasks/my/`;
      const aiUrl = `${API_BASE_URL}/api/tasksai/my/`;

      const fetchJson = async (url: string) => {
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
          }
          throw new Error(`Request failed (${res.status})`);
        }
        return res.json();
      };

      try {
        setLoading(true);
        setGeneralError(null);

        const results = await Promise.allSettled([fetchJson(humanUrl), fetchJson(aiUrl)]);

        // human
        if (results[0].status === 'fulfilled') {
          setHumanTasks(results[0].value as Task[]);
        } else {
          setHumanError(results[0].reason?.message ?? 'Failed to load tasks.');
        }

        // ai
        if (results[1].status === 'fulfilled') {
          setAiTasks(results[1].value as Task[]);
        } else {
          setAiError(results[1].reason?.message ?? 'Failed to load AI tasks.');
        }

        // collect project ids
        const combined = [
          ...(results[0].status === 'fulfilled' ? results[0].value : []),
          ...(results[1].status === 'fulfilled' ? results[1].value : []),
        ] as Task[];

        const extractProjectId = (t: Task): number | null => {
          if (!t) return null;
          const pAny = (t as any).project ?? (t as any).project_id ?? null;
          if (pAny == null) return null;
          if (typeof pAny === 'number') return pAny;
          if (typeof pAny === 'object' && pAny !== null && typeof (pAny as any).id === 'number') return (pAny as any).id;
          return null;
        };

        const uniqueIds = Array.from(
          new Set(
            combined
              .map(extractProjectId)
              .filter((pid): pid is number => typeof pid === 'number' && !isNaN(pid))
          )
        );

        // attempt batch fetch if API supports ?ids=1,2,3 pattern
        const map: ProjectMap = {};
        if (uniqueIds.length > 0) {
          try {
            const batchUrl = `${API_BASE_URL}/api/projects/?ids=${uniqueIds.join(',')}`;
            const pjRes = await fetch(batchUrl, {
              headers: { Authorization: `Token ${token}` },
              signal,
            });
            if (pjRes.ok) {
              const pjJson = await pjRes.json();
              // support both array or paginated
              const items = Array.isArray(pjJson) ? pjJson : pjJson.results ?? [];
              items.forEach((p: any) => {
                if (p && typeof p.id === 'number') map[p.id] = p.name ?? p.title ?? `Project #${p.id}`;
              });
            } else {
              // fallback to individual fetches
              throw new Error('Batch fetch not supported');
            }
          } catch (batchErr) {
            // individual fetches (parallel) with graceful fallback
            await Promise.all(uniqueIds.map(async pid => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/projects/${pid}/`, {
                  headers: { Authorization: `Token ${token}` },
                  signal,
                });
                if (!res.ok) throw new Error(`Failed to fetch project ${pid}`);
                const pj = await res.json();
                map[pid] = pj.name ?? pj.title ?? `Project #${pid}`;
              } catch (err) {
                // don't fail whole flow for a single project
                // eslint-disable-next-line no-console
                console.warn(`Error loading project ${pid}:`, err);
                map[pid] = `Project #${pid}`;
              }
            }));
          }
        }

        setProjectNames(map);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Unexpected error loading tasks:', err);
        setGeneralError(err?.message ?? 'An unknown error occurred.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    load();

    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const firstNonEmpty = (...vals: Array<any>) => {
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      return v;
    }
    return null;
  };

  const formatDate = (raw?: string | null) => {
    if (!raw) return '—';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString();
    } catch {
      return raw;
    }
  };

  const getProjectId = (task: Task): number | null => {
    if (!task) return null;
    if (typeof task.project_id === 'number') return task.project_id;
    const p = (task as any).project;
    if (typeof p === 'number') return p;
    if (typeof p === 'object' && p !== null && typeof p.id === 'number') return p.id;
    return null;
  };

  const getProjectLabel = (task: Task) => {
    const explicitName = firstNonEmpty(task.project_name, (task as any).project?.name, (task as any).project?.title);
    if (explicitName) return explicitName;
    const pid = getProjectId(task);
    if (pid && projectNames[pid]) return projectNames[pid];
    if (pid) return `Project #${pid}`;
    return '—';
  };

  const getDueDate = (task: Task) => {
    const raw = firstNonEmpty(task.due_date, task.deadline, task.due, task.assigned_at, task.created_at);
    return formatDate(raw);
  };

  if (loading) return <p>Loading…</p>;
  if (generalError) return <p style={{ color: 'red' }}>{generalError}</p>;

  const renderTable = (title: string, rows: Task[], endpointError: string | null, prefixKey: string) => {
    return (
      <section style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>{title} ({rows.length})</h4>
        {endpointError && <p style={{ color: 'orange' }}>Error: {endpointError}</p>}
        {rows.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div className="table-responsive my-4">
            <table className="table g-table" style={{ minWidth: '1000px', marginTop: '0.25rem' }}>
              <thead>
                <tr>
                  {['Project', 'Title', 'Due Date', 'Priority'].map(h => (
                    <th key={h} style={{ padding: '0.5rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(task => {
                  const projectLabel = getProjectLabel(task);
                  const due = getDueDate(task);
                  const priority = firstNonEmpty(task.priority, (task as any).prio) ?? '—';
                  const rowKey = `${prefixKey}-${task.id}`;

                  return (
                    <tr key={rowKey}>
                      <td style={{ padding: '0.5rem' }}>{projectLabel}</td>
                      <td style={{ padding: '0.5rem' }}>{task.title ?? '—'}</td>
                      <td style={{ padding: '0.5rem' }}>{due}</td>
                      <td style={{ padding: '0.5rem' }}>{priority}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3>My Assigned Tasks</h3>

      {renderTable('Human Tasks', humanTasks, humanError, 'human')}
      {renderTable('AI Tasks', aiTasks, aiError, 'ai')}

      <div style={{ marginTop: 12 }}>
        <small style={{ color: '#666' }}>API base: {API_BASE_URL}</small>
      </div>
    </div>
  );
}
