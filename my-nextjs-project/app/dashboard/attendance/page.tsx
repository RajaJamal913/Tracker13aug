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
import dayjs from 'dayjs';

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
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    id: null as number | null,
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

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteShiftId, setDeleteShiftId] = useState<number | null>(null);
  const [deleteShiftName, setDeleteShiftName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Reset form to default
  const resetForm = () => {
    setForm({
      id: null,
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

  // 2️⃣ Fetch daily totals + today's shifts when "daily" is active
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
  const fetchShifts = () => {
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
  };

  useEffect(() => {
    fetchShifts();
  }, [activeTab]);

  // 4️⃣ Handle Edit Shift
  const handleEditShift = (shift: any) => {
    setModalType('edit');
    setForm({
      id: shift.id,
      name: shift.name,
      members: shift.member_ids || [],
      working_days: Array.isArray(shift.working_days) ? shift.working_days : (shift.working_days || '').split(',').filter(Boolean),
      timezone: shift.timezone || 'Asia/Karachi',
      start_date: shift.start_date || '',
      required_hours: shift.required_hours || 8,
      shift_type: shift.shift_type || 'standard',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      repeat_option: shift.repeat_option || 'none',
      repeat_until: shift.repeat_until || '',
    });
    setShowModal(true);
  };

  // 5️⃣ Handle Delete Shift Confirmation
  const handleDeleteClick = (shiftId: number, shiftName: string) => {
    setDeleteShiftId(shiftId);
    setDeleteShiftName(shiftName);
    setShowDeleteModal(true);
  };

  // 6️⃣ Confirm Delete Shift
  const confirmDeleteShift = async () => {
    if (!deleteShiftId) return;
    
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/shifts/${deleteShiftId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete shift');
      }

      // Refresh shifts list
      fetchShifts();
      
      // Close modal and reset
      setShowDeleteModal(false);
      setDeleteShiftId(null);
      setDeleteShiftName('');
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.toString());
    } finally {
      setDeleteLoading(false);
    }
  };

  // 7️⃣ Submit Shift (Create or Update)
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

      const url = modalType === 'create' 
        ? `${API_BASE}/api/shifts/`
        : `${API_BASE}/api/shifts/${form.id}/`;

      const method = modalType === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Token ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save shift');
      }

      // Refresh shifts list
      const listRes = await fetch(`${API_BASE}/api/shifts/`, {
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Token ${token}` 
        },
      });
      
      if (listRes.ok) {
        setShiftsData(await listRes.json());
      }

      // Reset and close modal
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      setModalError(e.toString());
    } finally {
      setModalLoading(false);
    }
  };

  // 8️⃣ Open Create Modal
  const openCreateModal = () => {
    setModalType('create');
    resetForm();
    setShowModal(true);
  };

  // Helper function to get status based on shift time
  const getStatus = (shift: any) => {
    const now = dayjs();
    const shiftStartTime = dayjs(`${TODAY} ${shift.start_time}`);
    const shiftEndTime = dayjs(`${TODAY} ${shift.end_time}`);
    
    if (now.isBefore(shiftStartTime)) {
      return 'Upcoming';
    } else if (now.isAfter(shiftEndTime)) {
      return 'Completed';
    } else {
      // Check if late (15 minutes grace period)
      const gracePeriod = shiftStartTime.add(15, 'minute');
      if (now.isAfter(gracePeriod)) {
        return 'Late';
      }
      return 'On Time';
    }
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'late':
        return 'text-danger';
      case 'on time':
        return 'text-success';
      case 'upcoming':
        return 'text-warning';
      case 'completed':
        return 'text-secondary';
      default:
        return 'text-muted';
    }
  };

  return (
    <div className="container-fluid px-sm-0 mt-5">
      {/* Tabs */}
      <div className="multi-style tabContainer profile-settings-tabs-wrapper mb-4">
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
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading attendance data...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : activeTab === 'daily' ? (
          <>
            {/* Daily Attendance Table - Updated to match image */}
            <div className="table-responsive g-table-wrapper gt-scroll mb-4">
              <h5 className="mb-3">Attendance Data - {TODAY}</h5>
              <table className='table g-table table-hover' style={{minWidth:"1000px"}}>
                <thead className="thead-dark">
                  <tr>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Shift Starts</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Shift Ends</th>
                    <th>Tracked Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyShifts.length > 0 ? (
                    dailyShifts.flatMap(shift => 
                      shift.member_usernames?.map((member: string, index: number) => {
                        const status = getStatus(shift);
                        const statusColor = getStatusColor(status);
                        
                        // Calculate tracked time (this would come from your API)
                        // For now, using the shift.tracked_hours or calculating based on shift times
                        const startTime = dayjs(`${TODAY} ${shift.start_time}`);
                        const endTime = dayjs(`${TODAY} ${shift.end_time}`);
                        const trackedHours = shift.tracked_hours || 
                          (status === 'Completed' ? endTime.diff(startTime, 'hour') : 0);
                        
                        return (
                          <tr key={`${shift.id}-${index}`}>
                            <td className="fw-bold">{member}</td>
                            <td>
                              <span className={`fw-bold ${statusColor}`}>
                                {status}
                              </span>
                            </td>
                            <td>{shift.start_time}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span className="text-muted">@ tracking</span>
                              </div>
                            </td>
                            <td>{shift.end_time}</td>
                            <td>1:00PM</td>
                            <td className="fw-bold">{trackedHours}hr</td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    <tr>
                      {/* <td colSpan={7} className="text-center py-4">
                        No shifts scheduled for today
                      </td> */}
                    </tr>
                  )}
                  
                  {/* Sample static data matching your image */}
                  <tr>
                    <td className="fw-bold">Hamza</td>
                    <td>
                      <span className="fw-bold text-danger">
                        Late
                      </span>
                    </td>
                    <td>7:00PM</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted">@ tracking</span>
                      </div>
                    </td>
                    <td>9:00PM</td>
                    <td>1:00PM</td>
                    <td className="fw-bold">5hr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Today's Shifts Cards */}
            <div className="row mt-4">
              <h5 className="mb-3">Today's Shifts Overview</h5>
              {dailyShifts.length > 0 ? dailyShifts.map(s => (
                <div className="col-lg-3 col-md-4 col-sm-6 mb-3" key={s.id}>
                  <div className="card shift_card_1 border-0 g-shadow h-100 p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <strong className="text-truncate">{s.name}</strong>
                      <span className={`badge ${getStatusColor(getStatus(s))} bg-light`}>
                        {getStatus(s)}
                      </span>
                    </div>
                    <div className="d-flex gap-2 align-items-center mb-2">
                      <span className="text-muted">
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                          <path d="M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z"></path>
                        </svg>
                      </span>
                      <span>Time: {s.start_time} – {s.end_time}</span>
                    </div>
                    <div className='d-flex gap-2 align-items-center mb-2'>
                      <span className="text-muted">
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                          <path d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"></path>
                        </svg>
                      </span>
                      <span className="text-truncate">Members: {s.member_usernames?.join(', ') || 'No members'}</span>
                    </div>
                    <div className='d-flex gap-2 align-items-center'>
                      <span className="text-muted">
                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                          <path d="M256,8C119,8,8,119,8,256S119,504,256,504,504,393,504,256,393,8,256,8Zm92.49,313h0l-20,25a16,16,0,0,1-22.49,2.5h0l-67-49.72a40,40,0,0,1-15-31.23V112a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16V256l58,42.5A16,16,0,0,1,348.49,321Z"></path>
                        </svg>
                      </span>
                      <span>Tracked Hours: {s.tracked_hours || 0}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-12">
                  <div className="alert alert-info">
                    No shifts scheduled for today.
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="mb-3 btn g-btn" onClick={openCreateModal}>
              Create Shift
            </button>
            
            {shiftsData.length > 0 ? (
              shiftsData.map(s => (
                <div key={s.id} className="card shift_card_1 p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5>{s.name}</h5>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <button 
                        className="g-btn"
                        onClick={() => handleEditShift(s)}
                      >
                        Edit
                      </button>
                      <button 
                        className="g-btn"
                        onClick={() => handleDeleteClick(s.id, s.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div>Members: {s.member_usernames?.join(', ') || 'No members'}</div>
                  <div>
                    Days:{' '}
                    {Array.isArray(s.working_days)
                      ? s.working_days.join(', ')
                      : s.working_days}
                  </div>
                  <div>Time: {s.start_time}–{s.end_time} ({s.timezone})</div>
                  <div>
                    Repeat: {s.repeat_option}
                    {s.repeat_option !== 'none' && s.repeat_until ? ` until ${s.repeat_until}` : ''}
                  </div>
                  <div>Start Date: {s.start_date}</div>
                  <div>Required Hours: {s.required_hours}</div>
                  <div>Shift Type: {s.shift_type}</div>
                </div>
              ))
            ) : (
              <p>No shifts found. Create your first shift!</p>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Shift Modal */}
      <Modal 
        contentClassName='border-0 rounded-4 g-shadow g-modal-conntent-wrapper' 
        show={showModal} 
        onHide={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{modalType === 'create' ? 'Create Shift' : 'Edit Shift'}</Modal.Title>
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
                  required={form.repeat_option !== 'none'}
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
          <button className='g-btn' onClick={() => {
            setShowModal(false);
            resetForm();
          }}>
            Cancel
          </button>
          <button className='g-btn' onClick={submitShift} disabled={modalLoading}>
            {modalLoading ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : modalType === 'create' ? 'Create' : 'Update'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        contentClassName='border-0 rounded-4 g-shadow g-modal-conntent-wrapper' 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the shift <strong>"{deleteShiftName}"</strong>?</p>
          <p className="text-danger"><small>This action cannot be undone.</small></p>
        </Modal.Body>
        <Modal.Footer>
          <button 
            className='g-btn' 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteLoading}
          >
            Cancel
          </button>
          <button 
            className='g-btn btn-danger' 
            onClick={confirmDeleteShift} 
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : 'Delete'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}