/* File: components/TimeTracker.tsx */
'use client';

import { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import FilterMultiSelects from '@/components/FilterMultiSelects';

export default function TimeTracker() {
  const [showModal, setShowModal] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareLink = 'https://tracker.example.com/timeline/view?user=7890&date=2024-10-20';

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const [currency, setCurrency] = useState<string | null>(null);
  const fileType = [
    { label: 'CSV', value: 'csv' },
    { label: 'PKR (Pakistani Rupee)', value: 'pkr' },
  ];

  const currencyOptions = [
    { label: 'USD (US Dollar)', value: 'usd' },
    { label: 'PKR (Pakistani Rupee)', value: 'pkr' },
  ];

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const data = [
    { name: 'Muhammad Jamal', project: 'Project Nebula', mon: 100, tue: 42, avg: 71 },
    { name: 'Mirza Ammad', project: 'Crimson Wave', mon: 78, tue: 65, avg: 71.5 },
    { name: 'Hina Fatima', project: 'Echo Horizon', mon: 20, tue: 50, avg: 35 },
    { name: 'Fatima Imran', project: 'SMM Campaign', mon: 88, tue: 32, avg: 60 },
    { name: 'Iqra Fatima', project: 'Lunar Drift', mon: 90, tue: 100, avg: 95 },
  ];

  return (
    <div className="container py-4">
      {/* Header and actions */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <h2 className="page-heading-wrapper">Activity Level</h2>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn g-btn" onClick={handleShow}>+ Schedule</button>
          <button className="btn g-btn" onClick={() => setShowShareModal(true)}>Share</button>
          <button className="btn g-btn">Export</button>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col-lg-12">
          <FilterMultiSelects />
        </div>
      </div>

      {/* Data table */}
      <table className="table g-table text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th>Member</th>
            <th>Project</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Average</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m, i) => (
            <tr key={i}>
              <td>{m.name}</td>
              <td>{m.project}</td>
              <td>{m.mon}%</td>
              <td>{m.tue}%</td>
              <td>
                <div className="progress" style={{ height: '20px' }}>
                  <div
                    className={`progress-bar ${
                      m.avg >= 80 ? 'bg-success' : m.avg >= 60 ? 'bg-warning' : 'bg-danger'
                    }`}
                    role="progressbar"
                    style={{ width: `${m.avg}%` }}
                  >
                    {m.avg}%
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Schedule</h5>
                <button type="button" className="btn-close" onClick={handleClose} />
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input type="text" className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Format</label>
                    <Dropdown value={currency} options={fileType} onChange={e => setCurrency(e.value)} placeholder="Select Format" className="w-100" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Currency</label>
                    <Dropdown value={currency} options={currencyOptions} onChange={e => setCurrency(e.value)} placeholder="Select Currency" className="w-100" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>Close</button>
                <button type="button" className="btn btn-primary">Save Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title text-primary">Share Report</h5>
                <button type="button" className="btn-close" onClick={() => setShowShareModal(false)} />
              </div>
              <div className="modal-body">
                <p>Share the report link with others, even outside of Webwiz Tracker</p>
                <div className="input-group">
                  <input type="text" className="form-control" value={shareLink} readOnly />
                  <button className="btn btn-outline-primary" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}