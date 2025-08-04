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
import FilterMultiSelects from '@/components/FilterMultiSelects';  // npm install dayjs

// Base URL for API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AttendancePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'shifts'>('daily');

  // Data
  const [dailyData, setDailyData] = useState<{ member: string; total: string }[]>([]);
  const [dailyShifts, setDailyShifts] = useState<any[]>([]);
  const [shiftsData, setShiftsData] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<{ label: string; value: number }[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
      { headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` } }
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
   <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <h2 className="page-heading-wrapper">Attendance</h2>
        <div className='d-flex gap-2 flex-wrap'>
          {/* <button className="btn g-btn me-2">
            +Schedule
          </button> */}
         

          
        </div>
      </div>
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
      <div className="mb-4">
        <FilterMultiSelects />

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
            <div className="g-table-wrap table-responsive gt-scroll">
              <table className='table g-table'>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Shift Start</th>
                    <th>Member</th>
                    <th>Member</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((r, i) => (
                    <tr key={i}>
                      <td>{r.member}</td>
                      <td>{r.total}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>


            {/* Today’s shifts */}
            <div className="row">
            <h5 className="mt-4">Shifts for {TODAY}</h5>
 {dailyShifts.length > 0 ? dailyShifts.map(s => (
<div className="col-lg-3">
     <div key={s.id} className="card shift_card_1 border-0 g-shadow mb-2 p-3">
                <strong>{s.name}</strong>
                <div className="d-flex gap-2 align-items-center">
                  <span><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z"></path></svg></span><span>Time: {s.start_time} – {s.end_time}</span></div>
                <div className='d-flex gap-2 align-items-center'><span><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"></path></svg></span><span>Members: {s.member_usernames.join(', ')}</span></div>
                <div className='d-flex gap-2 align-items-center'><span><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z"></path></svg></span><span>Tracked Hours: {s.tracked_hours}</span></div>
              </div>
</div>
           
            )) : (
              <p>No shifts scheduled for today.</p>
            )}
            </div>
            
           
          </>
        ) : (
          <>
          <div className="row">
            <div className="col-lg-12 text-end">

<button className="btn g-btn mb-3 ms-auto" style={{width:"fit-content"}} onClick={() => setShowModal(true)}>
              Create Shift
            </button>
            </div>
            {shiftsData.map(s => (
              <div className="col-lg-4">
                <div key={s.id} className="card shift_card_1 border-0 g-shadow mb-2 p-3">
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
              </div>
              
            ))}
          </div>
            
          </>
        )}
      </div>

      {/* Create Shift Modal */}
      <Modal  contentClassName='border-0 rounded-4 g-shadow g-modal-conntent-wrapper' show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Shifts</Modal.Title>
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