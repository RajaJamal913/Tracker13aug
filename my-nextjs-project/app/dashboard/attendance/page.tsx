'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Spinner,
  Alert,
  Badge,
} from 'react-bootstrap';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { MultiSelect } from 'primereact/multiselect';
import dayjs from 'dayjs';

// Base URL for API (ensure this includes /api if your backend needs it)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function AttendancePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'shifts'>('daily');

  // Data
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dailyShifts, setDailyShifts] = useState<any[]>([]);
  const [shiftsData, setShiftsData] = useState<any[]>([]);
  const [assignedShifts, setAssignedShifts] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<{ label: string; value: number }[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Attendance data
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({}); // key: `${shiftId}|${memberUsername}`

  // current user info (used to decide if current user is creator)
  const [currentUser, setCurrentUser] = useState<{ id?: number; username?: string; email?: string; fullName?: string } | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Notifications modal
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteShiftId, setDeleteShiftId] = useState<number | null>(null);
  const [deleteShiftName, setDeleteShiftName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state for create/edit
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

  // Fix for SSR: Only set appendTo on client
  const [appendTarget, setAppendTarget] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppendTarget(document.body);
    }
  }, []);

  // Constants
  const TODAY = dayjs().format('YYYY-MM-DD');
  const GRACE_MINUTES = 15;

  // Format helpers
  // formatTime: shows times in 12-hour format with AM/PM when possible
  const formatTime = (timeStr: string | undefined | null) => {
    if (!timeStr) return '';
    // if it already contains AM/PM just normalize case
    if (/[AaPp][Mm]/.test(timeStr)) {
      return String(timeStr).toUpperCase();
    }
    // if it looks like HH:mm or H:mm or includes seconds, attach TODAY for parsing
    const candidate = dayjs(`${TODAY} ${timeStr}`);
    if (candidate.isValid()) return candidate.format('h:mm A');
    // fallback: try parsing timeStr alone
    const tOnly = dayjs(timeStr);
    if (tOnly.isValid()) return tOnly.format('h:mm A');
    // as last resort return the original
    return String(timeStr);
  };

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
    { label: 'Bi-Weekly', value: 'bi-weekly' },
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

  // Auth token helper
  const makeHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };
  };

  // fetchCurrentUser: returns {id?, username?} from several endpoints and localStorage fallback
  const fetchCurrentUser = async () => {
    const tryPaths = [
      `${API_BASE}/api/users/me/`,
      `${API_BASE}/api/whoami/`,
      `${API_BASE}/api/auth/user/`,
      `${API_BASE}/api/user/`,
      `${API_BASE}/api/profile/`,
      `${API_BASE}/api/accounts/me/`,
    ];
    for (const url of tryPaths) {
      try {
        const res = await fetch(url, { headers: makeHeaders() });
        if (!res.ok) continue;
        const data = await res.json();
        // attempt to extract id and username from common shapes
        const id =
          data?.id ??
          data?.user?.id ??
          data?.data?.id ??
          (typeof data?.pk === 'number' ? data.pk : undefined);

        const usernameRaw =
          data?.username ??
          data?.user?.username ??
          data?.data?.username ??
          (typeof data?.email === 'string' ? data.email.split('@')[0] : undefined) ??
          data?.name ??
          undefined;

        const username = usernameRaw ? String(usernameRaw).trim() : undefined;

        const email =
          data?.email ??
          data?.user?.email ??
          undefined;

        const fullName =
          data?.full_name ??
          data?.name ??
          ((data?.first_name || data?.last_name) ? `${data?.first_name || ''} ${data?.last_name || ''}`.trim() : undefined);

        if (id || username || email) {
          setCurrentUser({ id, username, email, fullName });
          // persist lightweight info so UI can use it quickly
          if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('user_id', String(id));
            if (username) localStorage.setItem('username', String(username));
            if (email) localStorage.setItem('email', String(email));
            if (fullName) localStorage.setItem('full_name', String(fullName));
          }
          return;
        }
      } catch (err) {
        // ignore and continue trying other endpoints
      }
    }
    // fallback to localStorage values if present
    const lsName = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    const lsIdRaw = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    const lsEmail = typeof window !== 'undefined' ? localStorage.getItem('email') : null;
    const lsFull = typeof window !== 'undefined' ? localStorage.getItem('full_name') : null;
    const lsId = lsIdRaw ? Number(lsIdRaw) : undefined;
    if (lsName || lsId || lsEmail) {
      setCurrentUser({ id: lsId, username: lsName ?? undefined, email: lsEmail ?? undefined, fullName: lsFull ?? undefined });
      return;
    }
    setCurrentUser(null);
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 1️⃣ Load members
  useEffect(() => {
    fetch(`${API_BASE}/api/members/`, {
      headers: makeHeaders(),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setMembersList(
          (Array.isArray(data) ? data : []).map((m: any) => ({
            label: m.username ?? (`${m.first_name || ''} ${m.last_name || ''}`.trim() || `#${m.id}`),
            value: m.id,
          }))
        );
      })
      .catch(err => console.error('Members fetch error:', err));
  }, []);

  // Fetch assigned shifts for current user (members) — minimal normalization only
  const fetchAssignedShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts/assigned/`, { headers: makeHeaders() });
      if (!res.ok) {
        setAssignedShifts([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // Simple normalization
      const normalized = list.map((s: any) => {
        const created_by_username =
          s.created_by_username ??
          s.created_by?.username ??
          (typeof s.created_by === 'string' ? s.created_by : undefined) ??
          undefined;
        const created_by_id = s.created_by_id ?? s.created_by?.id ?? s.creator_id ?? undefined;
        const created_by_display_name = s.created_by_display_name ?? s.created_by?.full_name ?? s.created_by?.name ?? undefined;
        const created_by_email = s.created_by_email ?? (s.created_by && s.created_by.email) ?? undefined;
        return { ...s, created_by_username, created_by_id, created_by_display_name, created_by_email };
      });

      setAssignedShifts(normalized);
    } catch (err) {
      console.error('Assigned shifts fetch error:', err);
      setAssignedShifts([]);
    }
  };

  // Fetch notifications for current user's Member record
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts/notifications/`, { headers: makeHeaders() });
      if (!res.ok) return setNotifications([]);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : (Array.isArray(data.notifications) ? data.notifications : []));
    } catch (err) {
      console.error('Notifications fetch error:', err);
      setNotifications([]);
    }
  };

  // NEW: fetch attendance for a given date (defaults to TODAY)
  const fetchAttendance = async (date = TODAY) => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/?date=${date}`, { headers: makeHeaders() });
      if (!res.ok) {
        setAttendanceList([]);
        setAttendanceMap({});
        return;
      }
      const data = await res.json(); // expecting array or { attendances: [...] } or { attendances }
      const arr = Array.isArray(data) ? data : (Array.isArray(data.attendances) ? data.attendances : []);
      setAttendanceList(arr);

      // build map keyed by `${shiftId}|${memberUsername}`
      const map: Record<string, any> = {};
      for (const a of arr) {
        const shiftId = a.shift ?? a.shift_id ?? (a.shift && a.shift.id) ?? null;
        const username = a.member_username ?? (a.member && a.member_username) ?? (a.member && a.member.user && a.member.user.username) ?? a.member ?? null;
        if (shiftId != null && username) {
          map[`${shiftId}|${username}`] = a;
        }
      }
      setAttendanceMap(map);
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setAttendanceList([]);
      setAttendanceMap({});
    }
  };

  // 2️⃣ Fetch daily totals + today's tracked shifts when "daily" is active
  useEffect(() => {
    if (activeTab !== 'daily') return;
    setLoading(true);
    setError(null);

    const dailyFetch = fetch(`${API_BASE}/api/tracker/?type=hours&range=day`, {
      headers: makeHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject(r.statusText));

    const shiftsFetch = fetch(
      `${API_BASE}/api/shifts/tracked/?date=${TODAY}`,
      { headers: makeHeaders() }
    ).then(r => r.ok ? r.json() : Promise.reject(r.statusText));

    Promise.all([dailyFetch, shiftsFetch])
      .then(([dailyJson, shiftsJson]) => {
        setDailyData(Array.isArray(dailyJson) ? dailyJson : []);
        setDailyShifts(Array.isArray(shiftsJson) ? shiftsJson : []);
        // once we have today's shifts, fetch attendance too
        fetchAttendance(TODAY);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));

    // also refresh assigned shifts & notifications for the user view
    fetchAssignedShifts();
    fetchNotifications();
  }, [activeTab]);

  // 3️⃣ Fetch all shifts when "shifts" is active (creator view) and assigned shifts
  const fetchShifts = async () => {
    if (activeTab !== 'shifts') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/shifts/`, { headers: makeHeaders() });
      if (!res.ok) {
        setShiftsData([]);
        return;
      }
      const all = await res.json();
      const list = Array.isArray(all) ? all : [];

      // Simple normalization
      const normalized = list.map((m: any) => {
        const createdByUsername =
          m.created_by_username ??
          m.created_by?.username ??
          (typeof m.created_by === 'string' ? m.created_by : undefined) ??
          undefined;
        const createdById = m.created_by_id ?? m.created_by?.id ?? m.creator_id ?? undefined;
        const createdByDisplay = m.created_by_display_name ?? m.created_by?.full_name ?? m.created_by?.name ?? undefined;
        const createdByEmail = m.created_by_email ?? (m.created_by && m.created_by.email) ?? undefined;
        return { ...m, created_by_username: createdByUsername, created_by_id: createdById, created_by_display_name: createdByDisplay, created_by_email: createdByEmail };
      });

      setShiftsData(normalized);
    } catch (err: any) {
      console.error('Shifts fetch error:', err);
      setError(err?.toString() ?? 'Failed to fetch shifts');
    } finally {
      setLoading(false);
    }

    // always try to fetch assigned shifts (member view)
    fetchAssignedShifts();
  };

  useEffect(() => {
    fetchShifts();
  }, [activeTab]);

  // 4️⃣ Handle Edit Shift (prefill modal)
  const handleEditShift = (shift: any) => {
    setModalType('edit');
    setForm({
      id: shift.id,
      name: shift.name,
      members: Array.isArray(shift.members) ? shift.members : (shift.member_ids || []),
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
      const res = await fetch(`${API_BASE}/api/shifts/${deleteShiftId}/`, {
        method: 'DELETE',
        headers: makeHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to delete shift');
      }

      // Refresh both creator/all list and assigned list
      fetchShifts();
      fetchAssignedShifts();

      // also refresh attendance/notifications
      fetchAttendance(TODAY);
      fetchNotifications();

      // Close modal and reset
      setShowDeleteModal(false);
      setDeleteShiftId(null);
      setDeleteShiftName('');
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(String(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  // 7️⃣ Submit Shift (Create or Update)
  const submitShift = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
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
        headers: makeHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save shift');
      }

      // Refresh both creator/all list and assigned list (members need to see it)
      await fetchShifts();
      await fetchAssignedShifts();
      await fetchNotifications();

      // refresh attendance because new shift assignment may create notifications/attendance expectations
      await fetchAttendance(TODAY);

      // Reset and close modal
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      setModalError(String(e));
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

  // Helper to get member attendance status (prefers real attendance if available)
  const getMemberAttendanceStatus = (shift: any, memberUsername: string) => {
    const now = dayjs();
    // compute shift start & end (handle overnight)
    let shiftStart = dayjs(`${TODAY} ${shift.start_time}`);
    let shiftEnd = dayjs(`${TODAY} ${shift.end_time}`);
    if (!shift.start_time || !shift.end_time) {
      shiftStart = dayjs();
      shiftEnd = dayjs();
    } else if (shift.end_time <= shift.start_time) {
      // overnight: end next day
      shiftEnd = shiftEnd.add(1, 'day');
    }

    const key = `${shift.id}|${memberUsername}`;
    const attendance = attendanceMap[key];

    if (attendance) {
      // prefer server status if provided
      const st = (attendance.status || '').toUpperCase();
      const lateMins = attendance.late_minutes ?? null;
      const trackedSeconds = attendance.tracked_seconds ?? null;
      if (st === 'ON_TIME' || st === 'ON-TIME' || st === 'ONTIME') {
        return { label: 'On Time', color: 'text-success', lateMinutes: 0, trackedSeconds };
      }
      if (st === 'LATE') {
        return { label: `Late${lateMins ? ` (${lateMins}m)` : ''}`, color: 'text-danger', lateMinutes: lateMins, trackedSeconds };
      }
      if (st === 'ABSENT') {
        return { label: 'Absent', color: 'text-danger', lateMinutes: null, trackedSeconds };
      }
      // unknown status fallback
      return { label: st || 'Present', color: 'text-muted', lateMinutes: lateMins, trackedSeconds };
    }

    // No attendance recorded yet — infer from current time
    if (now.isBefore(shiftStart)) {
      return { label: 'Upcoming', color: 'text-warning', lateMinutes: null, trackedSeconds: null };
    }

    // within shift window
    const graceEnd = shiftStart.add(GRACE_MINUTES, 'minute');
    if (now.isAfter(shiftEnd)) {
      // Passed shift end and no attendance -> Absent
      return { label: 'Absent', color: 'text-danger', lateMinutes: null, trackedSeconds: null };
    }

    if (now.isAfter(graceEnd)) {
      return { label: 'Late', color: 'text-danger', lateMinutes: Math.max(0, now.diff(shiftStart, 'minute')), trackedSeconds: null };
    }

    // within grace period: still considered on time if they check-in now
    return { label: 'On Time', color: 'text-success', lateMinutes: 0, trackedSeconds: null };
  };

  // Helper function to get status color (CSS class)
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
      case 'absent':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  // Notifications count (unread)
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Render
  return (
    <div className="container-fluid px-sm-0 mt-5">
      {/* Tabs + Notifications */}
      <div className="d-flex justify-content-between align-items-center mb-3">
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
            {/* Daily Attendance Table */}
            <div className="table-responsive g-table-wrapper gt-scroll mb-4">
              <h5 className="mb-3">Attendance Data - {TODAY}</h5>
              <table className='table g-table table-hover' style={{minWidth:"1000px"}}>
                <thead className="thead-dark">
                  <tr>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyShifts.length > 0 ? (
                    dailyShifts.flatMap(shift =>
                      (shift.member_usernames || shift.members || []).map((member: string, index: number) => {
                        const att = getMemberAttendanceStatus(shift, member);
                        const statusColor = getStatusColor(att.label);
                        return (
                          <tr key={`${shift.id}-${index}`}>
                            <td className="fw-bold">{member}</td>
                            <td>
                              <span className={`fw-bold ${statusColor}`}>
                                {att.label}
                              </span>
                            </td>
                            <td>{formatTime(shift.start_time)}</td>
                            <td>{formatTime(shift.end_time)}</td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4">No shifts scheduled for today</td>
                    </tr>
                  )}
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
                      <span className={`badge ${getStatusColor(getMemberAttendanceStatus(s, (s.member_usernames || s.members || [])[0] || '').label)} bg-light`}>
                        {getMemberAttendanceStatus(s, (s.member_usernames || s.members || [])[0] || '').label}
                      </span>
                    </div>
                    <div className="d-flex gap-2 align-items-center mb-2">
                      <span className="text-muted">Time: {formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                    </div>
                    <div className='d-flex gap-2 align-items-center mb-2'>
                      <span className="text-truncate">Members: {(s.member_usernames || s.members || []).join ? (s.member_usernames || s.members).join(', ') : 'No members'}</span>
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
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button className="mb-3 btn g-btn" onClick={openCreateModal}>
                Create Shift
              </button>
            </div>

            {/* If assigned shifts exist, show them first (member view) */}
            {assignedShifts.length > 0 && (
              <>
                <h6>My Assigned Shifts</h6>
                {assignedShifts.map(s => (
                  <div key={`assigned-${s.id}`} className="card shift_card_1 p-3 mb-2">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <h5>{s.name}</h5>
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        {/* SHOW Edit/Delete FOR ALL */}
                        <>
                          <button className="g-btn" onClick={() => handleEditShift(s)}>Edit</button>
                          <button className="g-btn" onClick={() => handleDeleteClick(s.id, s.name)}>Delete</button>
                        </>
                      </div>
                    </div>
                    <div>Members: {(s.member_usernames || s.members || []).join ? (s.member_usernames || s.members).join(', ') : 'No members'}</div>
                    <div>
                      Days:{' '}
                      {Array.isArray(s.working_days)
                        ? s.working_days.join(', ')
                        : s.working_days}
                    </div>
                    <div>Time: {formatTime(s.start_time)}–{formatTime(s.end_time)} ({s.timezone})</div>
                    <div>
                      Repeat: {s.repeat_option}
                      {s.repeat_option !== 'none' && s.repeat_until ? ` until ${s.repeat_until}` : ''}
                    </div>
                    <div>Start Date: {s.start_date}</div>
                    <div>Required Hours: {s.required_hours}</div>
                    <div>Shift Type: {s.shift_type}</div>
                  </div>
                ))}
              </>
            )}

            {/* Creator / all shifts list */}
            <h6 className="mt-4">All Shifts</h6>
            {shiftsData.length > 0 ? (
              shiftsData.map(s => (
                <div key={`all-${s.id}`} className="card shift_card_1 p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5>{s.name}</h5>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      {/* SHOW Edit/Delete FOR ALL */}
                      <>
                        <button className="g-btn" onClick={() => handleEditShift(s)}>
                          Edit
                        </button>
                        <button className="g-btn" onClick={() => handleDeleteClick(s.id, s.name)}>
                          Delete
                        </button>
                      </>
                    </div>
                  </div>
                  <div>Members: {(s.member_usernames || s.members || []).join ? (s.member_usernames || s.members).join(', ') : 'No members'}</div>
                  <div>
                    Days:{' '}
                    {Array.isArray(s.working_days)
                      ? s.working_days.join(', ')
                      : s.working_days}
                  </div>
                  <div>Time: {formatTime(s.start_time)}–{formatTime(s.end_time)} ({s.timezone})</div>
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
          <button className='g-btn' onClick={() => { setShowModal(false); resetForm(); }}>
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
