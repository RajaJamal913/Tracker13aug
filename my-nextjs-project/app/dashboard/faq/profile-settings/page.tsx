'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState<{ old: boolean; new: boolean; confirm: boolean }>({
    old: false,
    new: false,
    confirm: false,
  });

  type PasswordField = 'old' | 'new' | 'confirm';

  const togglePasswordVisibility = (field: PasswordField) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <>
            <div className="cardHeader d-flex justify-content-start align-items-center p-4">
              <h5 className="cardTitle text-white m-0">Change Profile Information Here</h5>
            </div>
            <form className="p-4">
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" defaultValue="Hina" />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" defaultValue="Fatima" />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" defaultValue="Hinafatima123@gmail.com" />
              </div>
              <button type="submit" className="saveButton">
                Save Changes
              </button>
            </form>
          </>
        );
      case 'personal':
        return (
          <>
            <div className="cardHeader d-flex justify-content-start align-items-center p-4">
              <h5 className="cardTitle text-white m-0">Personal Information</h5>
            </div>
            <form className="p-4">
              <div className="mb-3">
                <label className="form-label">Birthday</label>
                <div className="d-flex gap-2">
                  <select className="form-select">
                    <option>Month</option>
                    <option>January</option>
                    <option>February</option>
                    <option>March</option>
                    <option>...</option>
                  </select>
                  <select className="form-select">
                    <option>Day</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i}>{i + 1}</option>
                    ))}
                  </select>
                  <select className="form-select">
                    <option>Year</option>
                    {[...Array(100)].map((_, i) => (
                      <option key={i}>{2025 - i}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Marital Status</label>
                <select className="form-select">
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" placeholder="Your address" />
              </div>

              <div className="mb-3">
                <label className="form-label">Contact Number</label>
                <input type="text" className="form-control" placeholder="03xx-xxxxxxx" />
              </div>

              <button type="submit" className="saveButton">
                Save Changes
              </button>
            </form>
          </>
        );
      case 'security':
        return (
          <>
            <div className="cardHeader d-flex justify-content-start align-items-center p-4">
              <h5 className="cardTitle text-white m-0">Login Security</h5>
            </div>
            <form className="p-4">
              {(['old', 'new', 'confirm'] as PasswordField[]).map((type) => (
                <div className="mb-3 position-relative" key={type}>
                  <label className="form-label">
                    {type === 'old' && 'Old Password'}
                    {type === 'new' && 'New Password'}
                    {type === 'confirm' && 'Confirm Password'}
                  </label>
                  <input
                    type={showPassword[type] ? 'text' : 'password'}
                    className="form-control pr-5"
                    placeholder={`Enter ${type} password`}
                  />
                  <span
                    className="eyeIcon"
                    onClick={() => togglePasswordVisibility(type)}
                    style={{ cursor: 'pointer' }}
                  >
                    <FontAwesomeIcon
                      icon={showPassword[type] ? 'eye-slash' : 'eye'}
                      className="text-secondary"
                    />
                  </span>
                </div>
              ))}

              <button type="submit" className="saveButton">
                Update Password
              </button>
            </form>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mt-5">
      {/* Tab Header */}
      <div className="tabContainer profile-settings-tabs-wrapper">
        <div className="tabs-wrapper">
          {['profile', 'personal', 'security'].map((tab) => (
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
      <div className="cardWrapper">{renderForm()}</div>

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
          color: #8e44ec;
        }

        .active {
          color: #8e44ec;
          border-bottom: 2px solid #8e44ec;
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
          background-color: #8e44ec;
          height: 50px;
          width: 100%;
        }

        .cardTitle {
          margin-bottom: 1.5rem;
          font-weight: 600;
          color: #8e44ec;
        }

        .saveButton {
          background-color: #c084fc;
          color: white;
          padding: 0.5rem 1.25rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
        }

        .eyeIcon {
          position: absolute;
          right: 10px;
          top: 35px;
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
}