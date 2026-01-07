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
  // attendanceMap stores by multiple keys (username and id): key -> attendanceRow
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({}); // e.g. "12|raj" or "12|id:5"

  // current user info (used to decide if current user is creator)
  const [currentUser, setCurrentUser] = useState<{ id?: number; username?: string; email?: string; fullName?: string } | null>(null);
  const [currentUserVariants, setCurrentUserVariants] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  // Check-in loading state per shift/member key
  const [checkinLoading, setCheckinLoading] = useState<Record<string, boolean>>({});

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

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '';
    const dt = dayjs(`2000-01-01 ${time}`);
    return dt.format('h:mm A');
  };

  // --- Helpers for usernames normalization and comparison ---

  const normalizeString = (s?: string | null) => {
    if (!s) return '';
    return String(s).trim().toLowerCase();
  };

  const normalizeMemberUsername = (member: any): string | null => {
    if (member === null || member === undefined) return null;

    if (typeof member === 'string') {
      const s = member.trim();
      return s.length ? s : null;
    }

    if (typeof member === 'number') {
      return null;
    }

    if (typeof member === 'object') {
      if (typeof member.username === 'string' && member.username.trim()) return member.username.trim();
      if (member.user) {
        if (typeof member.user.username === 'string' && member.user.username.trim()) return member.user.username.trim();
        if (typeof member.user === 'string' && member.user.trim()) return member.user.trim();
      }
      if (typeof member.display_name === 'string' && member.display_name.trim()) return member.display_name.trim();
      if (typeof member.full_name === 'string' && member.full_name.trim()) return member.full_name.trim();
      if (typeof member.name === 'string' && member.name.trim()) return member.name.trim();
      if (typeof member.email === 'string' && member.email.includes('@')) return member.email.split('@')[0].trim();
      if (typeof member.user?.username === 'string') return member.user.username;
    }

    return null;
  };

  const resolveMemberId = (member: any): number | null => {
    if (member === null || member === undefined) return null;
    if (typeof member === 'number') return member;
    if (typeof member === 'object') {
      if (typeof member.id === 'number') return member.id;
      if (typeof member.pk === 'number') return member.pk;
      if (typeof member.member_id === 'number') return member.member_id;
      if (typeof member.id === 'number') return member.id;
    }
    return null;
  };

  useEffect(() => {
    if (!currentUser) {
      setCurrentUserVariants([]);
      return;
    }
    const variants = new Set<string>();
    if (currentUser.username) variants.add(String(currentUser.username).trim());
    if (currentUser.email && typeof currentUser.email === 'string' && currentUser.email.includes('@')) {
      variants.add(currentUser.email.split('@')[0].trim());
    }
    if (currentUser.fullName) {
      variants.add(String(currentUser.fullName).trim());
      try {
        const parts = String(currentUser.fullName).trim().split(/\s+/).filter(Boolean);
        if (parts.length) {
          variants.add(parts[0].trim());
          if (parts.length > 1) variants.add(parts.slice(-1)[0].trim());
        }
      } catch (e) { /* ignore */ }
    }

    for (const v of Array.from(variants)) {
      const stripped = v.replace(/^[a-zA-Z]\./, '');
      if (stripped !== v) variants.add(stripped);
      const cleaned = v.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned !== v) variants.add(cleaned);
    }

    const list = Array.from(variants).filter(Boolean).map(s => String(s));
    setCurrentUserVariants(list);
    console.debug('Derived currentUserVariants:', list);
  }, [currentUser]);

  const usernamesEqual = (a?: string | null, b?: string | null) => {
    if (!a || !b) return false;
    return normalizeString(a) === normalizeString(b);
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

  const handleFormChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

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

  const makeHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };
    console.debug('makeHeaders ->', headers);
    return headers;
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
        console.debug('fetchCurrentUser request to', url, 'status', res.status);
        if (!res.ok) continue;
        const data = await res.json();
        console.debug('fetchCurrentUser response data:', data);

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
          console.debug('Resolved currentUser:', { id, username, email, fullName });
          if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('user_id', String(id));
            if (username) localStorage.setItem('username', String(username));
            if (email) localStorage.setItem('email', String(email));
            if (fullName) localStorage.setItem('full_name', String(fullName));
          }
          return;
        }
      } catch (err) {
        console.warn('fetchCurrentUser error for', url, err);
      }
    }
    const lsName = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    const lsIdRaw = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    const lsEmail = typeof window !== 'undefined' ? localStorage.getItem('email') : null;
    const lsFull = typeof window !== 'undefined' ? localStorage.getItem('full_name') : null;
    const lsId = lsIdRaw ? Number(lsIdRaw) : undefined;
    if (lsName || lsId || lsEmail) {
      setCurrentUser({ id: lsId, username: lsName ?? undefined, email: lsEmail ?? undefined, fullName: lsFull ?? undefined });
      console.debug('Resolved currentUser from localStorage', { id: lsId, username: lsName, email: lsEmail, fullName: lsFull });
      return;
    }
    setCurrentUser(null);
    console.debug('No currentUser resolved; set to null');
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // debug currentUser whenever it changes
  useEffect(() => {
    console.debug('AttendancePage currentUser changed ->', currentUser);
  }, [currentUser]);

  // 1️⃣ Load members
  useEffect(() => {
    fetch(`${API_BASE}/api/members/`, {
      headers: makeHeaders(),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        console.debug('Fetched members list:', data);
        setMembersList(
          (Array.isArray(data) ? data : []).map((m: any) => ({
            label: m.username ?? (`${m.first_name || ''} ${m.last_name || ''}`.trim() || `#${m.id}`),
            value: m.id,
          }))
        );
      })
      .catch(err => console.error('Members fetch error:', err));
  }, []);

  const fetchAssignedShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts/assigned/`, { headers: makeHeaders() });
      console.debug('fetchAssignedShifts status', res.status);
      if (!res.ok) {
        setAssignedShifts([]);
        return;
      }
      const data = await res.json();
      console.debug('Assigned shifts raw:', data);
      const list = Array.isArray(data) ? data : [];

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

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shifts/notifications/`, { headers: makeHeaders() });
      console.debug('fetchNotifications status', res.status);
      if (!res.ok) return setNotifications([]);
      const data = await res.json();
      console.debug('Notifications:', data);
      setNotifications(Array.isArray(data) ? data : (Array.isArray((data as any).notifications) ? (data as any).notifications : []));
    } catch (err) {
      console.error('Notifications fetch error:', err);
      setNotifications([]);
    }
  };

  //
  // NEW attendance fetching helpers:
  //

  // fetch attendance for one shift+date; returns array of attendance rows
  const fetchAttendanceForShift = async (date = TODAY, shiftId?: number) => {
    try {
      const url = shiftId
        ? `${API_BASE}/api/attendance/?date=${date}&shift=${shiftId}`
        : `${API_BASE}/api/attendance/?date=${date}`;
      const res = await fetch(url, { headers: makeHeaders() });
      console.debug('fetchAttendanceForShift', url, 'status', res.status);
      if (!res.ok) return [];
      const body = await res.json();
      const arr = Array.isArray(body) ? body : (Array.isArray((body as any).attendances) ? (body as any).attendances : []);
      console.debug(`Attendance rows for shift=${shiftId} ->`, arr);
      return arr;
    } catch (err) {
      console.error('fetchAttendanceForShift error', err);
      return [];
    }
  };

  // fetch attendance for many shifts and build a merged map
  const fetchAttendance = async (date = TODAY, shiftIds?: number[]) => {
    try {
      let allRows: any[] = [];
      if (Array.isArray(shiftIds) && shiftIds.length > 0) {
        const promises = shiftIds.map(id => fetchAttendanceForShift(date, id));
        const arrays = await Promise.all(promises);
        allRows = arrays.flat();
      } else {
        allRows = await fetchAttendanceForShift(date, undefined);
      }

      setAttendanceList(allRows);

      const map: Record<string, any> = {};
      for (const a of allRows) {
        const shiftId = a.shift ?? a.shift_id ?? (a.shift && a.shift.id) ?? null;
        const rawMember = a.member_username ?? a.member ?? (a.member && a.member.user && a.member.user.username) ?? null;
        const usernameResolved = normalizeMemberUsername(rawMember) ?? (typeof rawMember === 'string' ? rawMember : null);

        if (shiftId != null && usernameResolved) {
          const unameKey = `${shiftId}|user:${normalizeString(usernameResolved)}`;
          map[unameKey] = a;
        }

        const memberId = (typeof a.member === 'number' && a.member) ? a.member
          : (a.member && typeof a.member.id === 'number' ? a.member.id
            : (a.member_id && typeof a.member_id === 'number' ? a.member_id : null));

        if (shiftId != null && memberId != null) {
          const idKey = `${shiftId}|id:${memberId}`;
          map[idKey] = a;
        }

        if (shiftId != null && typeof rawMember === 'string' && rawMember.trim()) {
          const rawKey = `${shiftId}|raw:${rawMember.trim()}`;
          map[rawKey] = a;
        }
      }
      console.debug('Attendance map built (keys):', Object.keys(map));
      setAttendanceMap(map);
    } catch (err) {
      console.error('fetchAttendance error:', err);
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
      .then(async ([dailyJson, shiftsJson]) => {
        try {
          console.debug('dailyJson', dailyJson, 'shiftsJson', shiftsJson);
          setDailyData(Array.isArray(dailyJson) ? dailyJson : []);
          setDailyShifts(Array.isArray(shiftsJson) ? shiftsJson : []);

          const shiftIds = (Array.isArray(shiftsJson) ? shiftsJson : []).map((s: any) => s.id).filter(Boolean);
          if (shiftIds.length > 0) {
            await fetchAttendance(TODAY, shiftIds);
          } else {
            await fetchAttendance(TODAY);
          }
        } catch (err) {
          console.error('Error handling daily/shifts data:', err);
        }
      })
      .catch(err => {
        console.error('Error fetching daily data/shifts:', err);
        setError(String(err));
      })
      .finally(() => setLoading(false));

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
      console.debug('fetchShifts status', res.status);
      if (!res.ok) {
        setShiftsData([]);
        return;
      }
      const all = await res.json();
      console.debug('All shifts raw:', all);
      const list = Array.isArray(all) ? all : [];

      const normalized = list.map((m: any) => {
        const createdByUsername =
          m.created_by_username ?? m.created_by?.username ?? (typeof m.created_by === 'string' ? m.created_by : undefined) ?? undefined;
        const createdById = m.created_by_id ?? m.created_by?.id ?? m.creator_id ?? undefined;
        const createdByDisplay = m.created_by_display_name ?? m.created_by?.full_name ?? m.created_by?.name ?? undefined;
        const createdByEmail = m.created_by_email ?? (m.created_by && m.created_by.email) ?? undefined;
        return { ...m, created_by_username: createdByUsername, created_by_id: createdById, created_by_display_name: createdByDisplay, created_by_email: createdByEmail };
      });

      setShiftsData(normalized);

      // For creator view, fetch attendance for all these shifts as well
      const allShiftIds = normalized.map((s: any) => s.id).filter(Boolean);
      if (allShiftIds.length > 0) {
        await fetchAttendance(TODAY, allShiftIds);
      } else {
        await fetchAttendance(TODAY);
      }
    } catch (err: any) {
      console.error('Shifts fetch error:', err);
      setError(err?.toString() ?? 'Failed to fetch shifts');
    } finally {
      setLoading(false);
    }

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

      await fetchShifts();
      await fetchAssignedShifts();
      await fetchAttendance(TODAY);
      await fetchNotifications();

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

      await fetchShifts();
      await fetchAssignedShifts();
      await fetchNotifications();
      await fetchAttendance(TODAY);

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

  // Helper to get attendance action text from an attendance row (server or local)
  const getActionFromAttendance = (attendanceRow: any, shift: any) => {
    if (!attendanceRow) return null;
    if (attendanceRow._action) return attendanceRow._action;

    const st = (attendanceRow.status || '').toString().toUpperCase();
    const late = attendanceRow.late_minutes ?? attendanceRow.late ?? null;
    if (st === 'ON_TIME' || st === 'ON-TIME' || st === 'ONTIME') return 'Joined on time';
    if (st === 'LATE') {
      const m = typeof late === 'number' ? late : (attendanceRow.late_minutes ? attendanceRow.late_minutes : null);
      return `Joined late${m ? ` (${m}m)` : ''}`;
    }
    if (st === 'ABSENT') return 'Did not join (marked absent)';
    // fallback: if login_time is present try infer
    if (attendanceRow.login_time) {
      return 'Joined';
    }
    return null;
  };

  // Helper to get member attendance status (prefers real attendance if available)
  // Accepts 'member' as raw (string | object | id)
  // ID-first matching, safe username fallback (exact normalized match only)
  const getMemberAttendanceStatus = (shift: any, memberRaw: any) => {
    const now = dayjs();

    // compute shift start & end (handle overnight)
    let shiftStart = dayjs(`${TODAY} ${shift.start_time}`);
    let shiftEnd = dayjs(`${TODAY} ${shift.end_time}`);
    if (!shift.start_time || !shift.end_time) {
      return { label: 'Unknown', color: 'text-muted' as string, lateMinutes: null, trackedSeconds: null, matchedKey: null };
    } else if (shift.end_time <= shift.start_time) {
      shiftEnd = shiftEnd.add(1, 'day');
    }

    // Resolve both username and id from the memberRaw
    const usernameResolved = normalizeMemberUsername(memberRaw);
    const memberIdResolved = resolveMemberId(memberRaw);

    // Prefer id-based lookup
    let attendance = null;
    let matchedKey: string | null = null;

    if (memberIdResolved != null) {
      const idKey = `${shift.id}|id:${memberIdResolved}`;
      if (attendanceMap[idKey]) {
        attendance = attendanceMap[idKey];
        matchedKey = idKey;
        console.debug('Attendance matched by id', idKey, attendance);
      }
    }

    // Username exact normalized fallback (server may return member_username)
    if (!attendance && usernameResolved) {
      const unameKey = `${shift.id}|user:${normalizeString(usernameResolved)}`;
      if (attendanceMap[unameKey]) {
        attendance = attendanceMap[unameKey];
        matchedKey = unameKey;
        console.debug('Attendance matched by username key', unameKey, attendance);
      }
    }

    // Fallback: check raw key if attendanceMap stored raw:... (less preferred)
    if (!attendance && typeof memberRaw === 'string' && memberRaw.trim()) {
      const rawKey = `${shift.id}|raw:${memberRaw.trim()}`;
      if (attendanceMap[rawKey]) {
        attendance = attendanceMap[rawKey];
        matchedKey = rawKey;
        console.debug('Attendance matched by raw key', rawKey, attendance);
      }
    }

    // Final fallback: scan attendanceList for exact id or exact normalized username (no fuzzy).
    if (!attendance) {
      for (const a of attendanceList) {
        const sid = a.shift ?? a.shift_id ?? (a.shift && a.shift.id);
        if (sid != shift.id) continue;

        const aMemberId = (typeof a.member === 'number' && a.member) ? a.member
          : (a.member && typeof a.member.id === 'number' ? a.member.id : (a.member_id && typeof a.member_id === 'number' ? a.member_id : null));

        const aMemberUsername = a.member_username ?? (a.member && (a.member.username || a.member.user?.username)) ?? null;

        if (memberIdResolved != null && aMemberId != null && Number(memberIdResolved) === Number(aMemberId)) {
          attendance = a;
          matchedKey = `${shift.id}|id:${aMemberId}`;
          console.debug('AttendanceList matched by id fallback', matchedKey, a);
          break;
        }

        if (usernameResolved && aMemberUsername) {
          if (normalizeString(aMemberUsername) === normalizeString(usernameResolved)) {
            attendance = a;
            matchedKey = `${shift.id}|possible:${aMemberUsername}`;
            console.debug('AttendanceList matched by username fallback', matchedKey, a);
            break;
          }
        }
      }
    }

    // Interpret attendance if found
    if (attendance) {
      const st = (attendance.status || '').toUpperCase();
      const lateMins = attendance.late_minutes ?? null;
      const trackedSeconds = attendance.tracked_seconds ?? null;
      if (st === 'ON_TIME' || st === 'ON-TIME' || st === 'ONTIME') {
        return { label: 'On Time', color: 'text-success', lateMinutes: lateMins, trackedSeconds, matchedKey };
      }
      if (st === 'LATE') {
        return { label: `Late${lateMins ? ` (${lateMins}m)` : ''}`, color: 'text-danger', lateMinutes: lateMins, trackedSeconds, matchedKey };
      }
      if (st === 'ABSENT') {
        return { label: 'Absent', color: 'text-danger', lateMinutes: null, trackedSeconds, matchedKey };
      }
      return { label: st || 'Present', color: 'text-muted', lateMinutes: lateMins, trackedSeconds, matchedKey };
    }

    // No attendance recorded — fallback by time
    if (now.isBefore(shiftStart)) return { label: 'Upcoming', color: 'text-warning', lateMinutes: null, trackedSeconds: null, matchedKey: null };
    if (now.isBefore(shiftEnd)) return { label: 'Pending', color: 'text-secondary', lateMinutes: null, trackedSeconds: null, matchedKey: null };
    return { label: 'Absent', color: 'text-danger', lateMinutes: null, trackedSeconds: null, matchedKey: null };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'late':
        return 'text-danger';
      case 'on time':
        return 'text-success';
      case 'upcoming':
        return 'text-warning';
      case 'pending':
        return 'text-secondary';
      case 'completed':
        return 'text-secondary';
      case 'absent':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Check-in handler (for the current user)
  const isCurrentUserMember = (memberRaw: any) => {
    const memberId = resolveMemberId(memberRaw);
    if (memberId != null && currentUser?.id != null) {
      if (Number(memberId) === Number(currentUser.id)) return true;
    }

    const candidateName = normalizeMemberUsername(memberRaw) ?? (typeof memberRaw === 'string' ? memberRaw : null);
    if (!candidateName) return false;

    const nmCandidate = normalizeString(candidateName);
    for (const v of currentUserVariants) {
      if (!v) continue;
      const nv = normalizeString(v);
      if (!nv) continue;
      if (nv === nmCandidate) {
        return true;
      }
      if (nv.length > 2 && nmCandidate.length > 2) {
        if (nv.includes(nmCandidate) || nmCandidate.includes(nv)) return true;
      }
      if (nv.replace(/[^a-z0-9]/g, '') === nmCandidate.replace(/[^a-z0-9]/g, '')) return true;
    }
    return false;
  };

  const handleCheckIn = async (shift: any, memberRaw: any) => {
    if (!isCurrentUserMember(memberRaw)) {
      console.warn('Check-in blocked: current user does not match memberRaw', { currentUser, memberRaw, currentUserVariants });
      return;
    }

    const memberId = resolveMemberId(memberRaw);
    const memberName = normalizeMemberUsername(memberRaw) ?? (typeof memberRaw === 'string' ? memberRaw : '');
    const checkinKey = `${shift.id}|${memberId != null ? `id:${memberId}` : normalizeString(memberName)}`;

    setCheckinLoading(s => ({ ...s, [checkinKey]: true }));
    try {
      const detectedAtIso = new Date().toISOString();
      const payload: any = {
        detected_at: detectedAtIso,
        shift: shift.id ?? undefined,
        ...(memberId != null ? { member: memberId } : { member_username: memberName }),
        timezone: shift?.timezone || undefined,
      };

      console.debug('Checkin payload ->', payload);

      const res = await fetch(`${API_BASE}/api/attendance/checkin/`, {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json;
      try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }

      console.debug('Checkin response status', res.status, 'body', json);

      if (!res.ok) {
        console.error('Check-in failed', res.status, json);
        setError(`Check-in failed: ${res.status} ${JSON.stringify(json)}`);
        return;
      }

      let attendanceRows: any[] = [];
      if (json == null) {
        attendanceRows = [];
      } else if (Array.isArray(json)) {
        attendanceRows = json;
      } else if (Array.isArray((json as any).attendances)) {
        attendanceRows = (json as any).attendances;
      } else if ((json as any).id || (json as any).status) {
        attendanceRows = [json];
      } else {
        attendanceRows = [];
      }

      // compute local action based on check-in timestamp vs shift start/end
      const checkinMoment = dayjs(detectedAtIso);
      let shiftStart = dayjs(`${TODAY} ${shift.start_time}`);
      let shiftEnd = dayjs(`${TODAY} ${shift.end_time}`);
      if (shift.end_time <= shift.start_time) {
        shiftEnd = shiftEnd.add(1, 'day');
      }

      // If server returned attendance rows, update them with computed _action (and possibly adjust status locally)
      setAttendanceMap(m => {
        const copy = { ...m };

        if (attendanceRows.length > 0) {
          for (const attendanceRow of attendanceRows) {
            const sid = attendanceRow.shift ?? attendanceRow.shift_id ?? (attendanceRow.shift && attendanceRow.shift.id);
            const uname = attendanceRow.member_username ?? (attendanceRow.member && attendanceRow.member.username) ?? null;
            const mid = (typeof attendanceRow.member === 'number' && attendanceRow.member) ? attendanceRow.member
              : (attendanceRow.member && typeof attendanceRow.member.id === 'number' ? attendanceRow.member.id
                : (attendanceRow.member_id && typeof attendanceRow.member_id === 'number' ? attendanceRow.member_id : null));

            // compute action + local status override if needed (after shift end -> mark absent locally)
            let actionText = getActionFromAttendance(attendanceRow, shift);

            // Only compute from checkinMoment if server didn't provide useful late_minutes/status
            if (!actionText) {
              const diff = checkinMoment.diff(shiftStart, 'minute');
              if (checkinMoment.isAfter(shiftEnd)) {
                actionText = 'Did not join (marked absent)';
                attendanceRow.status = 'ABSENT';
                attendanceRow.late_minutes = null;
              } else if (diff <= GRACE_MINUTES) {
                actionText = 'Joined on time';
                attendanceRow.status = 'ON_TIME';
                attendanceRow.late_minutes = 0;
              } else {
                actionText = `Joined late (${diff}m)`;
                attendanceRow.status = 'LATE';
                attendanceRow.late_minutes = diff;
              }
            } else {
              // if actionText indicates late but server didn't set late_minutes, set it
              if (actionText.startsWith('Joined late') && !attendanceRow.late_minutes) {
                const diff = checkinMoment.diff(shiftStart, 'minute');
                attendanceRow.late_minutes = diff > 0 ? diff : attendanceRow.late_minutes;
              }
              if (actionText.startsWith('Did not join')) {
                attendanceRow.status = 'ABSENT';
              }
            }

            attendanceRow._action = actionText;

            if (sid != null && uname) {
              copy[`${sid}|user:${normalizeString(uname)}`] = attendanceRow;
            }
            if (sid != null && mid != null) {
              copy[`${sid}|id:${mid}`] = attendanceRow;
            }
            if (sid != null && typeof attendanceRow.member_username === 'string') {
              copy[`${sid}|raw:${attendanceRow.member_username}`] = attendanceRow;
            }
          }
        } else {
          // fallback placeholder if server didn't return the created object
          const sid = shift.id;
          let actionText = '';
          const diff = checkinMoment.diff(shiftStart, 'minute');
          if (checkinMoment.isAfter(shiftEnd)) {
            actionText = 'Did not join (marked absent)';
            if (memberId != null) copy[`${sid}|id:${memberId}`] = { status: 'ABSENT', _action: actionText, detected_at: detectedAtIso };
            else copy[`${sid}|user:${normalizeString(memberName)}`] = { status: 'ABSENT', _action: actionText, detected_at: detectedAtIso };
          } else if (diff <= GRACE_MINUTES) {
            actionText = 'Joined on time';
            if (memberId != null) copy[`${sid}|id:${memberId}`] = { status: 'ON_TIME', late_minutes: 0, _action: actionText, detected_at: detectedAtIso };
            else copy[`${sid}|user:${normalizeString(memberName)}`] = { status: 'ON_TIME', late_minutes: 0, _action: actionText, detected_at: detectedAtIso };
          } else {
            actionText = `Joined late (${diff}m)`;
            if (memberId != null) copy[`${sid}|id:${memberId}`] = { status: 'LATE', late_minutes: diff, _action: actionText, detected_at: detectedAtIso };
            else copy[`${sid}|user:${normalizeString(memberName)}`] = { status: 'LATE', late_minutes: diff, _action: actionText, detected_at: detectedAtIso };
          }
        }

        console.debug('Updated attendanceMap after check-in. Keys now:', Object.keys(copy));
        return copy;
      });

      // ensure server canonical state for this shift
      if (shift?.id) {
        await fetchAttendance(TODAY, [shift.id]);
      } else {
        await fetchAttendance(TODAY);
      }

    } catch (err: any) {
      console.error('Check-in error:', err);
      setError(String(err?.message || err));
    } finally {
      setCheckinLoading(s => ({ ...s, [checkinKey]: false }));
    }
  };

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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyShifts.length > 0 ? (
                    dailyShifts.flatMap(shift =>
                      (shift.member_usernames || shift.members || []).map((member: any, index: number) => {
                        // display name for UI
                        const memberDisplay = normalizeMemberUsername(member) ?? (typeof member === 'string' ? member : (member && member.name) ? member.name : `#${index}`);
                        const att = getMemberAttendanceStatus(shift, member);
                        const statusColor = getStatusColor(att.label);

                        const key = `${shift.id}-${index}-${memberDisplay}`;
                        const memberId = resolveMemberId(member);
                        const checkinKey = `${shift.id}|${memberId != null ? `id:${memberId}` : normalizeString(memberDisplay)}`;
                        const canCheckIn = isCurrentUserMember(member) && att.label === 'Pending';

                        // If attendance matched, attempt to get the row and action text
                        let attendanceRow = null;
                        if (att.matchedKey) {
                          attendanceRow = attendanceMap[att.matchedKey] ?? attendanceList.find((a: any) => {
                            const sid = a.shift ?? a.shift_id ?? (a.shift && a.shift.id);
                            if (sid != shift.id) return false;
                            const aMemberId = (typeof a.member === 'number' && a.member) ? a.member
                              : (a.member && typeof a.member.id === 'number' ? a.member.id : (a.member_id && typeof a.member_id === 'number' ? a.member_id : null));
                            const aMemberUsername = a.member_username ?? (a.member && (a.member.username || a.member.user?.username)) ?? null;
                            if (memberId != null && aMemberId != null && Number(memberId) === Number(aMemberId)) return true;
                            if (normalizeString(aMemberUsername) === normalizeString(normalizeMemberUsername(member))) return true;
                            return false;
                          }) ?? null;
                        }

                        const actionText = attendanceRow ? getActionFromAttendance(attendanceRow, shift) : null;

                        return (
                          <tr key={key}>
                            <td className="fw-bold">
                              {memberDisplay}
                              <div style={{fontSize: '0.75rem'}} className="text-muted">
                                matchedKey:{(att as any).matchedKey ?? '—'}
                              </div>
                            </td>
                            <td>
                              <span className={`fw-bold ${statusColor}`}>
                                {att.label}
                              </span>
                            </td>
                            <td>{formatTime(shift.start_time)}</td>
                            <td>{formatTime(shift.end_time)}</td>
                            <td>
                              {attendanceRow ? (
                                <span className={attendanceRow.status && String(attendanceRow.status).toUpperCase() === 'ON_TIME' ? 'text-success' : attendanceRow.status && String(attendanceRow.status).toUpperCase() === 'ABSENT' ? 'text-danger' : 'text-warning'}>
                                  {actionText ?? (attendanceRow._action ?? 'Joined')}
                                </span>
                              ) : canCheckIn ? (
                                <button
                                  className="g-btn"
                                  onClick={() => handleCheckIn(shift, member)}
                                  disabled={!!checkinLoading[checkinKey]}
                                >
                                  {checkinLoading[checkinKey] ? <Spinner as="span" animation="border" size="sm" /> : 'Check In'}
                                </button>
                              ) : (
                                <span className="text-muted" style={{fontSize: '0.9rem'}}>
                                  {att.label === 'Upcoming' ? 'Not started' : att.label === 'Absent' ? 'No action' : ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4">No shifts scheduled for today</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Today's Shifts Cards */}
            <div className="row mt-4">
              <h5 className="mb-3">Today's Shifts Overview</h5>
              {dailyShifts.length > 0 ? dailyShifts.map(s => {
                const rawMembers = s.member_usernames || s.members || [];
                const firstRaw = rawMembers[0];
                const firstMember = normalizeMemberUsername(firstRaw) ?? String(firstRaw ?? '');
                const firstStatus = getMemberAttendanceStatus(s, firstRaw);
                const memberId = resolveMemberId(firstRaw);
                const checkinKey = `${s.id}|${memberId != null ? `id:${memberId}` : normalizeString(firstMember)}`;
                const currentUsernameResolved = currentUser?.username ? currentUser.username.trim() : null;
                const isMemberOfThisShift = rawMembers.some((m: any) => isCurrentUserMember(m));
                const canCheckIn = isMemberOfThisShift && firstStatus.label === 'Pending' && currentUsernameResolved != null;

                // first member attendance row if exists
                let firstAttendanceRow = null;
                if (firstStatus.matchedKey) firstAttendanceRow = attendanceMap[firstStatus.matchedKey] ?? null;
                const firstAction = firstAttendanceRow ? getActionFromAttendance(firstAttendanceRow, s) : null;

                return (
                  <div className="col-lg-3 col-md-4 col-sm-6 mb-3" key={s.id}>
                    <div className="card shift_card_1 border-0 g-shadow h-100 p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong className="text-truncate">{s.name}</strong>
                        <span className={`badge ${getStatusColor(firstStatus.label)} bg-light`}>
                          {firstStatus.label}
                        </span>
                      </div>
                      <div className="d-flex gap-2 align-items-center mb-2">
                        <span className="text-muted">Time: {formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                      </div>
                      <div className='d-flex gap-2 align-items-center mb-2'>
                        <span className="text-truncate">Members: {(rawMembers || []).map((m:any)=>normalizeMemberUsername(m)||String(m)).join(', ') || 'No members'}</span>
                      </div>
                      <div className="mt-auto d-flex gap-2">
                        {firstAttendanceRow ? (
                          <span className={firstAttendanceRow.status && String(firstAttendanceRow.status).toUpperCase() === 'ON_TIME' ? 'text-success' : firstAttendanceRow.status && String(firstAttendanceRow.status).toUpperCase() === 'ABSENT' ? 'text-danger' : 'text-warning'}>
                            {firstAction ?? firstAttendanceRow._action ?? 'Joined'}
                          </span>
                        ) : canCheckIn ? (
                          <button
                            className="g-btn"
                            onClick={() => handleCheckIn(s, firstRaw)}
                            disabled={!!checkinLoading[checkinKey]}
                          >
                            {checkinLoading[checkinKey] ? <Spinner as="span" animation="border" size="sm" /> : 'Check In'}
                          </button>
                        ) : (
                          <div style={{minHeight: '38px'}} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
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
                        <button className="g-btn" onClick={() => handleEditShift(s)}>Edit</button>
                        <button className="g-btn" onClick={() => handleDeleteClick(s.id, s.name)}>Delete</button>
                      </div>
                    </div>
                    <div>Members: {(s.member_usernames || s.members || []).map((m:any)=>normalizeMemberUsername(m)||String(m)).join(', ') || 'No members'}</div>
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

            <h6 className="mt-4">All Shifts</h6>
            {shiftsData.length > 0 ? (
              shiftsData.map(s => (
                <div key={`all-${s.id}`} className="card shift_card_1 p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5>{s.name}</h5>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <button className="g-btn" onClick={() => handleEditShift(s)}>
                        Edit
                      </button>
                      <button className="g-btn" onClick={() => handleDeleteClick(s.id, s.name)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div>Members: {(s.member_usernames || s.members || []).map((m:any)=>normalizeMemberUsername(m)||String(m)).join(', ') || 'No members'}</div>
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

      {/* Create/Edit Shift Modal (unchanged) */}
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

      {/* Delete Confirmation Modal (unchanged) */}
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
