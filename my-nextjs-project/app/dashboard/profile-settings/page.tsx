'use client';
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import Cookies from 'js-cookie';

export default function ProfileTabs() {
  // ─── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'profile' | 'personal' | 'security'>('profile');

  // ─── Shared state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Profile form state ──────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // ─── Personal form state ─────────────────────────────────────────────────────
  const [birthday, setBirthday] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // ─── Security form state ─────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  // const csrfHeader = () => ({ 'X-CSRFToken': Cookies.get('csrftoken') || '' });
  // build changes 
const csrfHeader = (): Record<string, string> => ({ 'X-CSRFToken': Cookies.get('csrftoken') || '' });

  // const authHeader = () => {
  //   const token = localStorage.getItem('token');
  //   return token ? { 'Authorization': `Token ${token}` } : {};
  // };
const authHeader = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Token ${token}` } : {};
};

  // ─── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'GET',
        credentials: 'include',
        headers: { ...authHeader(), ...csrfHeader() },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      }),
      fetch('http://127.0.0.1:8000/api/auth/personal/', {
        method: 'GET',
        credentials: 'include',
        headers: { ...authHeader(), ...csrfHeader() },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to load personal info');
        return res.json();
      })
    ])
      .then(([prof, pers]) => {
        setFirstName(prof.first_name);
        setLastName(prof.last_name);
        setEmail(prof.email);

        setBirthday(pers.birthday || '');
        setMaritalStatus(pers.marital_status || '');
        setAddress(pers.address || '');
        setContactNumber(pers.contact_number || '');
      })
      .catch(err => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ─── Save handlers ───────────────────────────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/profile/', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
          ...csrfHeader()
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setSuccessMessage('Profile updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/personal/', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
          ...csrfHeader()
        },
        body: JSON.stringify({
          birthday,
          marital_status: maritalStatus,
          address,
          contact_number: contactNumber
        })
      });
      if (!res.ok) throw new Error('Failed to update personal info');
      setSuccessMessage('Personal information updated.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/password/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
          ...csrfHeader()
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword })
      });
      if (!res.ok) {
        const errData = await res.json();
        const msg = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' • ');
        throw new Error(msg);
      }
      setSuccessMessage('Password changed successfully.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Renderers ───────────────────────────────────────────────────────────────
  const renderProfileForm = () => (
    loading
      ? <div className="text-center py-5"><Spinner animation="border" /> Loading profile…</div>
      : <>
        <div className="cardHeader p-4"><h5 className="text-white">Change Profile Information s</h5></div>
        {errorMessage && <div className="alert alert-danger m-3">{errorMessage}</div>}
        {successMessage && <div className="alert alert-success m-3">{successMessage}</div>}
        <Form onSubmit={handleProfileSave} className="p-4">
          <Form.Group className="mb-3">
            <Form.Label>First Name</Form.Label>
            <Form.Control type="text" value={firstName}
              onChange={e => setFirstName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Last Name</Form.Label>
            <Form.Control type="text" value={lastName}
              onChange={e => setLastName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </Form.Group>
          <button className='g-btn' type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </Form>
      </>
  );

  const renderPersonalForm = () => (
    loading
      ? <div className="text-center py-5"><Spinner animation="border" /> Loading personal info…</div>
      : <>
        <div className="cardHeader p-4"><h5 className="text-white">Personal Information</h5></div>
        {errorMessage && <div className="alert alert-danger m-3">{errorMessage}</div>}
        {successMessage && <div className="alert alert-success m-3">{successMessage}</div>}
        <Form onSubmit={handlePersonalSave} className="p-4">
          <Form.Group className="mb-3">
            <Form.Label>Birthday</Form.Label>
            <Form.Control type="date" value={birthday}
              onChange={e => setBirthday(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Marital Status</Form.Label>
            <Form.Select value={maritalStatus}
              onChange={e => setMaritalStatus(e.target.value)}>
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control type="text" value={address}
              onChange={e => setAddress(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contact Number</Form.Label>
            <Form.Control type="text" value={contactNumber}
              onChange={e => setContactNumber(e.target.value)} />
          </Form.Group>
          <Button variant="secondary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Form>
      </>
  );

  const renderSecurityForm = () => (
    <>
      <div className="cardHeader p-4"><h5 className="text-white">Login Security</h5></div>
      {errorMessage && <div className="alert alert-danger m-3">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success m-3">{successMessage}</div>}
      <Form onSubmit={handlePasswordChange} className="p-4">
        {(['old', 'new', 'confirm'] as const).map(field => {
          const labels = { old: 'Old Password', new: 'New Password', confirm: 'Confirm Password' };
          const values = { old: oldPassword, new: newPassword, confirm: confirmPassword };
          const setters = { old: setOldPassword, new: setNewPassword, confirm: setConfirmPassword };
          return (
            <Form.Group className="mb-3 position-relative" key={field}>
              <Form.Label>{labels[field]}</Form.Label>
              <Form.Control
                type={showPassword[field] ? 'text' : 'password'}
                value={values[field]}
                onChange={e => setters[field](e.target.value)}
                required
              />
              <span
                className="position-absolute end-0 top-50 translate-middle-y me-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))}
              >
                <i className={`fa-solid ${showPassword[field] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </Form.Group>
          );
        })}
        <Button variant="danger" type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </Form>
    </>
  );

  // ─── Final JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="container mt-5">
      {/* Tabs */}
      <div className="tabContainer profile-settings-tabs-wrapper mb-4">
        <div className="um-btns-wrap d-flex">
          {['profile', 'personal', 'security'].map(tab => (
            <button
              key={tab}
              className={`tabButton ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

      </div>

      {/* Card */}
      <div className="cardWrapper">
        {activeTab === 'profile' && renderProfileForm()}
        {activeTab === 'personal' && renderPersonalForm()}
        {activeTab === 'security' && renderSecurityForm()}
      </div>


      {/* Styles */}
      <style jsx>{`
        .tabContainer { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dee2e6; padding:0.5rem 1rem; background:#fff; border-radius:8px; }
       
    
        .avatar { background:#c084fc; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; }
        .cardWrapper { margin-top:1rem; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
       
        .cardTitle { margin:0; padding:0.75rem 1rem; color:#fff; font-weight:600; }
      `}</style>
    </div>
  );
}
