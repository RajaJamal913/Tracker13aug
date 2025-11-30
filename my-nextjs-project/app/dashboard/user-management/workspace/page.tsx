'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dropdown } from 'primereact/dropdown';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';


export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState('configuration');
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
// build chanege 
    // const togglePasswordVisibility = (field) => {
    const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };



  const [currency, setCurrency] = useState({ label: 'USD (US Dollar)', value: 'usd' });
  const [timezone, setTimezone] = useState({ label: 'UTC + 05:00 Asia/Karachi', value: 'utc+5' });
  const [durationFormat, setDurationFormat] = useState(null);
  const [clockFormat, setClockFormat] = useState(null);

  const currencyOptions = [
    { label: 'USD (US Dollar)', value: 'usd' },
    { label: 'PKR (Pakistani Rupee)', value: 'pkr' },
  ];

  const timezoneOptions = [
    { label: 'UTC + 05:00 Asia/Karachi', value: 'utc+5' },
    { label: 'UTC + 00:00 London', value: 'utc+0' },
  ];

  const durationOptions = [
    { label: 'HH:mm:ss', value: 'hhmmss' },
    { label: 'Decimal Hours', value: 'decimal' },
  ];

  const clockOptions = [
    { label: '12-Hour Clock', value: '12h' },
    { label: '24-Hour Clock', value: '24h' },
  ];


  const renderForm = () => {
    switch (activeTab) {
      case 'configuration':
        return (<>

          <div className="card shadow">
            <div className="card-header text-white fw-bold" style={{ backgroundColor: '#a441f5' }}>
              Configuration
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Workspace Name</label>
                <input type="text" className="form-control field-height" defaultValue="Web wiz Information Technology" />
              </div>

              <div className="mb-3 field-height">
                <label className="form-label">Currency</label>
                <Dropdown value={currency} options={currencyOptions} onChange={(e) => setCurrency(e.value)} placeholder="Select Currency" className="w-100" />
              </div>

              <div className="mb-3 field-height">
                <label className="form-label">System Timezone</label>
                <Dropdown value={timezone} options={timezoneOptions} onChange={(e) => setTimezone(e.value)} placeholder="Select Timezone" className="w-100" />
              </div>

              <div className="mb-3 field-height">
                <label className="form-label">Select workspace time duration format</label>
                <Dropdown value={durationFormat} options={durationOptions} onChange={(e) => setDurationFormat(e.value)} placeholder="Select Format" className="w-100" />
              </div>

              <div className="mb-3 field-height">
                <label className="form-label">Select workspace clock format</label>
                <Dropdown value={clockFormat} options={clockOptions} onChange={(e) => setClockFormat(e.value)} placeholder="Select Clock Format" className="w-100" />
              </div>

              <div className="mb-3">
                <span className="text-danger" style={{ cursor: 'pointer' }}>Delete my workspace</span>
              </div>

              <button className="btn" style={{ backgroundColor: '#c084f5', color: '#fff' }}>Save Changes</button>
            </div>
          </div>
        </>
        );
      case 'permission':
        return <>

          <div className="cardHeader d-flex justify-content-start align-items-center p-4">
            <h5 className="cardTitle text-white m-0">Change Profile Information Here</h5>
          </div>
          <div className="switvh-btns-wrap p-4">

            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="summaryReport" checked />
              <label className="form-check-label" htmlFor="summaryReport">Restrict Project Viewer access to user device information</label>
            </div>


            <div className="d-flex justify-content-end">

              <button className="btn g-btn">Save Changes</button>
            </div>
          </div>
        </>
      case 'security':
        return <>


          <div className="switvh-btns-wrap p-4">
            <div className="form-check form-switch mb-2 p-0">
              <label className="form-check-label" htmlFor="summaryReport"><div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" id="summaryReport" checked />
                <label className="form-check-label" htmlFor="summaryReport">Restrict Project Viewer access to user device information</label>
              </div></label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="summaryReport" checked />
              <label className="form-check-label" htmlFor="summaryReport">Enforce minimum password length
              </label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="summaryReport" checked />
              <label className="form-check-label" htmlFor="summaryReport">Restrict Project Viewer access to user device information</label>
            </div>


            <div className="d-flex justify-content-end">

              <button className="btn g-btn">Save Changes</button>
            </div>
          </div>
        </>
          ;
      default:
        return null;
    }
  };

  return (
    <div className="container mt-5">
      {/* Tab Header */}
      <div className="tabContainer profile-settings-tabs-wrapper">
        <div className="tabs-wrapper">
          {['configuration', 'permission', 'security'].map((tab) => (
            <button
              key={tab}
              className={`tabButton ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}

        </div>
        <div className="avatar">HF</div>
      </div>

      {/* Form Card */}
      <div className="cardWrapper">

        {renderForm()}
      </div>

      {/* Inline CSS */}
      <style jsx>{`
        .tabContainer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #dee2e6;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          background-color: #fff;
        }

        .tabButton {
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          margin-right: 1rem;
          font-weight: 500;
          color: #000;
          border-bottom: 2px solid transparent;
          transition: all 0.3s;
          cursor: pointer;
        }

        .tabButton:hover {
          color: #2f6ce5;
        }

        .active {
          color: #2f6ce5;
          border-bottom: 2px solid #2f6ce5;
        }

        .avatar {
          background-color: #c084fc;
          color: #fff;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
        }

        .cardWrapper {
          margin-top: 1rem;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          background-color: #fff;
        }

        .cardHeader {
          background-color: #2f6ce5;
          height: 50px;
          width: 100%;
        }

        .cardTitle {
          margin-bottom: 1.5rem;
          font-weight: 600;
          color: #2f6ce5;
        }

        .saveButton {
          background-color: #c084fc;
          color: white;
          padding: 0.5rem 1.25rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
