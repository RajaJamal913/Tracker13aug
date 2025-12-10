'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Table, Form } from 'react-bootstrap';
import FilterMultiSelects from '@/components/FilterMultiSelects';
import TimeCount from '@/components/time-counter';
import { Dropdown } from 'primereact/dropdown';

export default function TimeTrackerPage() {
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState(null);
  const [search, setSearch] = useState('');

  const shareLink = 'https://tracker.example.com/timeline/view?user=7890&date=2024-10-20';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const fileTypeOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'PDF', value: 'pdf' },
  ];

  const currencyOptions = [
    { label: 'USD (US Dollar)', value: 'usd' },
    { label: 'PKR (Pakistani Rupee)', value: 'pkr' },
  ];

  const membersData = [
    { name: "Hamza", project: "Team Lead", time: "7:00PM - 1:00AM", desktoptime: "7:00PM - 8:00AM", webtime: "7:00PM - 8:00AM", idletime: "7:00PM - 8:00AM", breaktime: "7:00PM - 8:00AM" },
    { name: "Ali", project: "Developer", time: "7:00PM - 1:00AM", desktoptime: "7:00PM - 8:00AM", webtime: "7:00PM - 8:00AM", idletime: "7:00PM - 8:00AM", breaktime: "7:00PM - 8:00AM" },
    { name: "Usman", project: "UX Designer", time: "7:00PM - 1:00AM", desktoptime: "7:00PM - 8:00AM", webtime: "7:00PM - 8:00AM", idletime: "7:00PM - 8:00AM", breaktime: "7:00PM - 8:00AM" },
    { name: "Anees", project: "QA Engineer", time: "7:00PM - 1:00AM", desktoptime: "7:00PM - 8:00AM", webtime: "7:00PM - 8:00AM", idletime: "7:00PM - 8:00AM", breaktime: "7:00PM - 8:00AM" },
    { name: "Azam", project: "Marketing", time: "7:00PM - 1:00AM", desktoptime: "7:00PM - 8:00AM", webtime: "7:00PM - 8:00AM", idletime: "7:00PM - 8:00AM", breaktime: "7:00PM - 8:00AM" },
  ];

  const filteredMembers = membersData.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="container py-3">
        <div className="row mb-3">
          <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
            {/* <TimeCount /> */}
            
                <h2 className="page-heading-wrapper">Timeline</h2>
            <div className="d-flex justify-content-between align-items-center gap-2">
                <button className="btn g-btn" onClick={handleShow}>+Schedule</button>
            <button className="btn g-btn" onClick={() => setShowShareModal(true)}>Share</button>
            <button className="btn g-btn" >Import</button>
            </div>
            
            {/* <button className="btn btn-outline-secondary">Export</button> */}
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-lg-12">
            <FilterMultiSelects />
          </div>
        </div>

        <div className="table-responsive g-table-wrap">
          <Table hover className="text-center g-table min-w-10">
            <thead>
              <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                <th>Members</th>
                <th>Project</th>
                <th>Time</th>
                <th>Desktop Time</th>
                <th>Web Time</th>
                <th>Idle Time</th>
                <th>Break Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => (
                <tr key={index} style={{ backgroundColor: "#F7ECFF" }}>
                  <td className="fw-bold">{member.name}</td>
                  <td>{member.project}</td>
                  <td>{member.time}</td>
                  <td>{member.desktoptime}</td>
                  <td>{member.webtime}</td>
                  <td>{member.idletime}</td>
                  <td>{member.breaktime}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content border-0 rounded-4 g-modal-conntent-wrapper shadow">
              <div className="modal-header">
                <h5 className="modal-title">Create Schedule</h5>
                <button type="button" className="btn-close" onClick={handleClose}></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="text" placeholder='Enter email address' className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Subject</label>
                    <input type="text" placeholder='Subject' className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message</label>
                    <input type="text" className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input type="date" className="form-control" />
                  </div>
                  <div className="mb-3 field-height">
                    <label className="form-label">Currency</label>
                    <Dropdown value={currency} options={currencyOptions} onChange={(e) => setCurrency(e.value)} placeholder="Select Currency" className="w-100" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3}></textarea>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn g-btn" onClick={handleClose}>Close</button>
                <button type="button" className="btn g-btn">Save Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 rounded-4 g-modal-conntent-wrapper shadow">
              <div className="modal-header">
                <h5 className="modal-title text-primary">Share Report</h5>
                <button type="button" className="btn-close" onClick={() => setShowShareModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Share the report link with others, even outside of Webwiz Tracker</p>
                <div className="input-group">
                  <input type="text" className="form-control" value={shareLink} readOnly />
                  <button className="btn btn-outline-primary" onClick={handleCopy}>
                    <i className="bi bi-clipboard"></i> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
