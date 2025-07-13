'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
export default function ProfileTabs() {
    const [activeTab, setActiveTab] = useState('general');
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

    const renderForm = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <>

                        <div className="cardHeader d-flex justify-content-start align-items-center p-4">
                            <h5 className="cardTitle text-white m-0">Change Profile Information Here</h5>
                        </div>
                        <div className="switvh-btns-wrap p-4">
                            <h6 className="mb-3">Reports</h6>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="summaryReport" checked />
                                <label className="form-check-label" htmlFor="summaryReport">Summary report emails</label>
                            </div>
                            <div className="form-check form-switch mb-4">
                                <input className="form-check-input" type="checkbox" id="trackedHours" checked />
                                <label className="form-check-label" htmlFor="trackedHours">Tracked hours reports emails</label>
                            </div>

                            <h6 className="mb-3">System</h6>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">New projects emails</label>
                            </div>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="manualTime" />
                                <label className="form-check-label" htmlFor="manualTime">Emails with manual time requests</label>
                            </div>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="timesheetApproval" checked />
                                <label className="form-check-label" htmlFor="timesheetApproval">Timesheet approval emails</label>
                            </div>
                            <div className="form-check form-switch mb-4">
                                <input className="form-check-input" type="checkbox" id="leaveInfo" checked />
                                <label className="form-check-label" htmlFor="leaveInfo">Emails with leave information</label>
                            </div>
<div className="d-flex justify-content-end">

                            <button className="btn g-btn">Save Changes</button>
</div>
                        </div>
                    </>
                );
        
            case 'task':
                return  <>

                        <div className="cardHeader d-flex justify-content-start align-items-center p-4">
                            <h5 className="cardTitle text-white m-0">Change Profile Information Here</h5>
                        </div>
                        <div className="switvh-btns-wrap p-4">
                          
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="summaryReport" checked />
                                <label className="form-check-label" htmlFor="summaryReport">Email about tasks I’m not assigned to</label>
                            </div>
                            <div className="form-check form-switch mb-4">
                                <input className="form-check-input" type="checkbox" id="trackedHours" checked />
                                <label className="form-check-label" htmlFor="trackedHours">Email about tasks status changes</label>
                            </div>


                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">Email about tasks comments of tasks</label>
                            </div>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="manualTime" checked/>
                                <label className="form-check-label" htmlFor="manualTime">Email about new user added to task</label>
                            </div>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="timesheetApproval" checked />
                                <label className="form-check-label" htmlFor="timesheetApproval">Email about a new due date added to task</label>
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
                    {['general', 'task'].map((tab) => (
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
      `}</style>
        </div>
    );
}
