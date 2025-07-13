'use client';
import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';

export default function AttendanceSettings() {
  const [afterStart, setAfterStart] = useState(10);
  const [beforeEnd, setBeforeEnd] = useState(15);
  const [trackingOutsideHours, setTrackingOutsideHours] = useState(false);
  const [remindMembers, setRemindMembers] = useState(true);
  const [reminderTime, setReminderTime] = useState('30 min');

  const reminderOptions = ['5 min', '10 min', '15 min', '30 min', '1 hour'];

  const handleSave = () => {
    console.log({
      afterStart,
      beforeEnd,
      trackingOutsideHours,
      remindMembers,
      reminderTime
    });
  };

  return (
    <div className="container-fluid py-5 px-0">
      <div className="card shadow rounded-3">
        <div className="card-header g-theme-bg text-white">
          <h5 className="mb-0">Attendance</h5>
        </div>
        <div className="card-body">

          {/* Allowed Deviation */}
          <div className="mb-4">
            <label className="fw-semibold">Allowed Deviation from Schedule</label>
            <div className="d-flex gap-2 mt-2 flex-wrap">
              <div>
                <div className="small text-muted mb-1">After start</div>
                <div className="input-group">
                  <button className="btn btn-outline-secondary" onClick={() => setAfterStart(prev => Math.max(prev - 1, 0))}>–</button>
                  <input type="text" value={afterStart} className="form-control text-center" readOnly />
                  <button className="btn btn-outline-secondary" onClick={() => setAfterStart(prev => prev + 1)}>+</button>
                </div>
              </div>
              <div>
                <div className="small text-muted mb-1">Before end</div>
                <div className="input-group">
                  <button className="btn btn-outline-secondary" onClick={() => setBeforeEnd(prev => Math.max(prev - 1, 0))}>–</button>
                  <input type="text" value={beforeEnd} className="form-control text-center" readOnly />
                  <button className="btn btn-outline-secondary" onClick={() => setBeforeEnd(prev => prev + 1)}>+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Disable Tracking Checkbox */}
          <div className="form-check mb-4">
            <input
              type="checkbox"
              className="form-check-input"
              id="trackingCheckbox"
              checked={trackingOutsideHours}
              onChange={() => setTrackingOutsideHours(!trackingOutsideHours)}
            />
            <label className="form-check-label text-primary" htmlFor="trackingCheckbox">
              Disable tracking outside of working hours
            </label>
          </div>

          {/* Reminder Toggle */}
          <div className="mb-4">
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="reminderSwitch"
                checked={remindMembers}
                onChange={() => setRemindMembers(!remindMembers)}
              />
              <label className="form-check-label fw-semibold" htmlFor="reminderSwitch">
                Remind members about the start of work time
              </label>
            </div>

            {remindMembers && (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small">Send reminder email</span>
                <select
                  className="form-select w-auto"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                >
                  {reminderOptions.map((option, idx) => (
                    <option key={idx} value={option}>{option}</option>
                  ))}
                </select>
                <span className="text-muted small">before work starts</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="text-end">
            <button className="btn g-btn px-4" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
