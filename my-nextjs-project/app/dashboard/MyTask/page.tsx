'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
interface Task {
  id: number;
  sequence_id: number;
  project_id: number;
  assignee: number | null;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  tasks_count: number;
}

interface ProjectMap {
  [id: number]: string;
}

function MyTaskPageComponent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectNames, setProjectNames] = useState<ProjectMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view your tasks.');
      setLoading(false);
      return;
    }

    fetch('http://localhost:8000/api/tasks/my/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
          }
          throw new Error(`Failed to fetch tasks (${res.status})`);
        }
        return res.json();
      })
      .then((data: Task[]) => {
        setTasks(data);
        const uniqueIds = Array.from(new Set(data.map(t => t.project_id)));
        return uniqueIds;
      })
      .then(async uniqueIds => {
        const map: ProjectMap = {};
        await Promise.all(
          uniqueIds.map(async pid => {
            try {
              const res = await fetch(`http://localhost:8000/api/projects/${pid}/`, {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Token ${localStorage.getItem('token')}`,
                },
              });
              if (!res.ok) throw new Error();
              const pj = await res.json();
              map[pid] = pj.name;
            } catch {
              map[pid] = `Project #${pid}`;
            }
          })
        );
        setProjectNames(map);
      })
      .catch(err => {
        console.error('Error fetching tasks:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h3>My Assigned Tasks</h3>
      {tasks.length === 0 ? (
        <p>You have no tasks assigned to you.</p>
      ) : (
        <table className="table g-table mt-2" style={{ width: '100%', marginTop: '0.5rem' }}>
          <thead>
            <tr>
              {['Project', 'Sequence #', 'Title', 'Due Date', 'Priority', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.5rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td style={{ padding: '0.5rem' }}>
                  {projectNames[task.project_id] ?? `Project #${task.project_id}`}
                </td>
                <td style={{ padding: '0.5rem' }}>{task.sequence_id}</td>
                <td style={{ padding: '0.5rem' }}>{task.title}</td>
                <td style={{ padding: '0.5rem' }}>{task.due_date ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{task.priority ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{task.status ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default dynamic(
  () => Promise.resolve(MyTaskPageComponent),
  { ssr: false }
);
