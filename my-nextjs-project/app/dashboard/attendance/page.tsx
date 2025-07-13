'use client';
import React, { useState, useEffect } from 'react';
import {
  Table,
  Modal,
  Button,
  Form,
  Spinner,
  Alert,
} from 'react-bootstrap';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { MultiSelect } from 'primereact/multiselect';
import dayjs from 'dayjs';  // npm install dayjs

// Base URL for API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AttendancePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'shifts'>('daily');

  // Data
  const [dailyData, setDailyData]         = useState<{ member: string; total: string }[]>([]);
  const [dailyShifts, setDailyShifts]     = useState<any[]>([]);
  const [shiftsData, setShiftsData]       = useState<any[]>([]);
  const [membersList, setMembersList]     = useState<{ label: string; value: number }[]>([]);

  // UI state
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [modalLoading, setModalLoading]   = useState(false);
  const [modalError, setModalError]       = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    members: [] as number[],
    working_days: [] as string[],
    timezone: 'Asia/Karachi',
    start_date: '',
    required_hours: 8,
    shift_type: 'standard',
    start_time: '',
    end_time: '',
    repeat_option: 'none',
    repeat_until: '',
  });

  // Fix for SSR: Only set appendTo on client
  const [appendTarget, setAppendTarget] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppendTarget(document.body);
    }
  }, []);

  // Constants
  const TODAY = dayjs().format('YYYY-MM-DD');

  const DAY_OPTIONS = [
    { label: 'Mon', value: 'Mon' },
    { label: 'Tue', value: 'Tue' },
    { label: 'Wed', value: 'Wed' },
    { label: 'Thu', value: 'Thu' },
    { label: 'Fri', value: 'Fri' },
    { label: 'Sat', value: 'Sat' },
    { label: 'Sun', value: 'Sun' },
  ];
  const SHIFT_TYPE_OPTIONS = [
    { label: 'Standard', value: 'standard' },
    { label: 'Adjustable', value: 'adjustable' },
  ];
  const REPEAT_OPTIONS = [
    { label: 'None', value: 'none' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Bi‑Weekly', value: 'bi-weekly' },
  ];

  // Helper to update form
  const handleFormChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // 1️⃣ Load members
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/members/`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setMembersList(
          data.map((m: any) => ({
            label: m.username ?? `${m.first_name} ${m.last_name}`.trim(),
            value: m.id,
          }))
        );
      })
      .catch(err => console.error('Members fetch error:', err));
  }, []);

  // 2️⃣ Fetch daily totals + today’s shifts when "daily" is active
  useEffect(() => {
    if (activeTab !== 'daily') return;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');

    const dailyFetch = fetch(`${API_BASE}/api/tracker/?type=hours&range=day`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
    }).then(r => r.ok ? r.json() : Promise.reject(r.statusText));

    const shiftsFetch = fetch(
      `${API_BASE}/api/shifts/tracked/?date=${TODAY}`,
      { headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` }}
    ).then(r => r.ok ? r.json() : Promise.reject(r.statusText));

    Promise.all([dailyFetch, shiftsFetch])
      .then(([dailyJson, shiftsJson]) => {
        setDailyData(dailyJson);
        setDailyShifts(shiftsJson);
      })
      .catch(err => setError(err.toString()))
      .finally(() => setLoading(false));
  }, [activeTab]);

  // 3️⃣ Fetch all shifts when "shifts" is active
  useEffect(() => {
    if (activeTab !== 'shifts') return;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/shifts/`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setShiftsData)
      .catch(err => setError(err.toString()))
      .finally(() => setLoading(false));
  }, [activeTab]);

  // 4️⃣ Submit new shift
  const submitShift = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        working_days: form.working_days.join(','),
        repeat_until: form.repeat_option === 'none' ? null : form.repeat_until,
      };
      const res = await fetch(`${API_BASE}/api/shifts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      // refresh list
      const listRes = await fetch(`${API_BASE}/api/shifts/`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
      });
      setShiftsData(await listRes.json());
      setShowModal(false);
      setForm({
        name: '',
        members: [],
        working_days: [],
        timezone: 'Asia/Karachi',
        start_date: '',
        required_hours: 8,
        shift_type: 'standard',
        start_time: '',
        end_time: '',
        repeat_option: 'none',
        repeat_until: '',
      });
    } catch (e: any) {
      setModalError(e.toString());
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="container-fluid px-0 mt-5">
      {/* Tabs */}
      <div className="tabContainer profile-settings-tabs-wrapper mb-4">
        <div className="um-btns-wrap d-flex">
          {(['daily', 'shifts'] as const).map(tab => (
            <button
              key={tab}
              className={`tabButton ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="cardWrappers">
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : activeTab === 'daily' ? (
          <>
            {/* Daily totals */}
            <Table hover>
              <thead>
                <tr><th>Member</th><th>Total</th></tr>
              </thead>
              <tbody>
                {dailyData.map((r, i) => (
                  <tr key={i}><td>{r.member}</td><td>{r.total}</td></tr>
                ))}
              </tbody>
            </Table>

            {/* Today’s shifts */}
            <h5 className="mt-4">Shifts for {TODAY}</h5>
            {dailyShifts.length > 0 ? dailyShifts.map(s => (
              <div key={s.id} className="card mb-2 p-3">
                <strong>{s.name}</strong>
                <div>Time: {s.start_time} – {s.end_time}</div>
                <div>Members: {s.member_usernames.join(', ')}</div>
                <div>Tracked Hours: {s.tracked_hours}</div>
              </div>
            )) : (
              <p>No shifts scheduled for today.</p>
            )}
          </>
        ) : (
          <>
            <Button className="mb-3" onClick={() => setShowModal(true)}>
              Create Shift
            </Button>
            {shiftsData.map(s => (
              <div key={s.id} className="card p-3 mb-2">
                <h5>{s.name}</h5>
                <div>Members: {s.member_usernames.join(', ')}</div>
                <div>
                  Days:{' '}
                  {Array.isArray(s.working_days)
                    ? s.working_days.join(', ')
                    : s.working_days}
                </div>
                <div>Time: {s.start_time}–{s.end_time} ({s.timezone})</div>
                <div>
                  Repeat: {s.repeat_option}
                  {s.repeat_option !== 'none' ? ` until ${s.repeat_until}` : ''}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Create Shift Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Shift</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && <Alert variant="danger">{modalError}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Members</Form.Label>
              <MultiSelect
                value={form.members}
                options={membersList}
                onChange={e => handleFormChange('members', e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select members"
                display="chip"
                filter
                appendTo={appendTarget}
                panelStyle={{ zIndex: 2000 }}
                className="w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Working Days</Form.Label>
              <MultiSelect
                value={form.working_days}
                options={DAY_OPTIONS}
                onChange={e => handleFormChange('working_days', e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select days"
                display="chip"
                className="w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={form.start_date}
                onChange={e => handleFormChange('start_date', e.target.value)}
                required
              />
            </Form.Group>

            <div className="row mb-3">
              <div className="col">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  value={form.start_time}
                  onChange={e => handleFormChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div className="col">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={form.end_time}
                  onChange={e => handleFormChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Required Hours</Form.Label>
              <Form.Control
                type="number"
                value={form.required_hours}
                onChange={e => handleFormChange('required_hours', Number(e.target.value))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Shift Type</Form.Label>
              <Form.Select
                value={form.shift_type}
                onChange={e => handleFormChange('shift_type', e.target.value)}
              >
                {SHIFT_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Repeat Option</Form.Label>
              <Form.Select
                value={form.repeat_option}
                onChange={e => handleFormChange('repeat_option', e.target.value)}
              >
                {REPEAT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {form.repeat_option !== 'none' && (
              <Form.Group className="mb-3">
                <Form.Label>Repeat Until</Form.Label>
                <Form.Control
                  type="date"
                  value={form.repeat_until}
                  onChange={e => handleFormChange('repeat_until', e.target.value)}
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Timezone</Form.Label>
              <Form.Control
                value={form.timezone}
                onChange={e => handleFormChange('timezone', e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={submitShift} disabled={modalLoading}>
            {modalLoading
              ? <Spinner as="span" animation="border" size="sm" />
              : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}