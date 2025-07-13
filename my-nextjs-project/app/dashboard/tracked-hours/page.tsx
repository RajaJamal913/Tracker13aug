'use client';
// app/TimeTracker/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Table, Spinner, Alert } from 'react-bootstrap';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';

interface TrackedRow {
  member: string;
  email: string;
  project: string;
  total: string;
}

const allColumns = [
  { label: 'Member',  value: 'member'  },
  { label: 'Email',   value: 'email'   },
  { label: 'Project', value: 'project' },
  { label: 'Total',   value: 'total'   },
];

const timeOptions = [
  { label: 'By Day',   value: 'day'   },
  { label: 'By Week',  value: 'week'  },
  { label: 'By Month', value: 'month' },
];

export default function TimeTrackerPage() {
  const [activeTab, setActiveTab]             = useState<'hours'|'amount'>('hours');
  const [selectedTime, setSelectedTime]       = useState<'day'|'week'|'month'>('day');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns.map(c=>c.value));
  const [data, setData]                       = useState<TrackedRow[]>([]);
  const [loading, setLoading]                 = useState<boolean>(false);
  const [error, setError]                     = useState<string|null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found.');
        }

        const qs = `?type=${activeTab}&range=${selectedTime}`;
        const res = await fetch(`http://127.0.0.1:8000/api/tracker/${qs}`, {
          headers: { Authorization: `Token ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }

        const rows: TrackedRow[] = await res.json();
        setData(rows);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, selectedTime]);

  return (
    <div className="container mt-5">
      {/* Tabs + Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex">
          {(['hours','amount'] as const).map(tab => (
            <button
              key={tab}
              className={`tabButton ${activeTab===tab ? 'active':''}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                marginRight: '0.5rem',
                border: activeTab===tab ? '2px solid #6f42c1' : '1px solid #ccc',
                borderRadius: '4px',
                background: activeTab===tab ? '#f8f0fc' : 'white'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="d-flex gap-3">
          <MultiSelect
            value={selectedColumns}
            options={allColumns}
            onChange={e => setSelectedColumns(e.value as string[])}
            optionLabel="label"
            display="chip"
            placeholder="Show Columns"
            className="w-14rem"
          />
          <Dropdown
            value={selectedTime}
            options={timeOptions}
            onChange={e => setSelectedTime(e.value as 'day'|'week'|'month')}
            placeholder="Time Range"
            className="w-12rem"
          />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Data Table */}
      {!loading && !error && (
        <div className="table-responsive">
          <Table hover className="text-center">
            <thead style={{ background: '#6f42c1', color: 'white' }}>
              <tr>
                {selectedColumns.map(col => (
                  <th key={col}>{allColumns.find(c=>c.value===col)?.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ background: '#f4eaff' }}>
                  {selectedColumns.map(col => (
                    <td key={col}>{(row as any)[col]}</td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={selectedColumns.length} className="text-muted py-4">
                    No records to display.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
