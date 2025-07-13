'use client';

import { useState } from 'react';
import { Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import FilterMultiSelects from '@/components/FilterMultiSelects'
import { Dropdown } from 'primereact/dropdown';
import DatePicker from 'react-datepicker';

export default function ProfileTabs() {
    const [showModal, setShowModal] = useState(false);
    const [showDelModal, setshowDelModal] = useState(false);
    const [holidayType, setHolidayType] = useState('Holiday');
    // const [startDate, setStartDate] = useState(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [teamScope, setTeamScope] = useState(null);
    const [team, setTeam] = useState(null);
    const [message, setMessage] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    // const [selectedMember, setSelectedMember] = useState(null);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    // Add the missing handleDeleteClick function
    // const handleDeleteClick = (member) => {
    //     setSelectedMember(member);
    //     setshowDelModal(true);
    // };
  const handleDeleteClick = (member: any) => {  // Fixed type
        setSelectedMember(member);
        setshowDelModal(true);
    };


    const teamScopeOptions = ['Team-wide', 'Specific Team'];
    const teamOptions = ['Development Team', 'Design Team', 'Marketing Team'];

    const handleSubmit = () => {
        console.log({
            holidayType,
            startDate,
            teamScope,
            team,
            message,
        });
        setShowModal(false); // close modal after submit
    };
    const handleSubmit2 = () => {
        console.log({
            holidayType,
            startDate,
            teamScope,
            team,
            message,
        });
        setshowDelModal(false); // close modal after submit
    };
  const handleClose = () => {
    setShowModal(false);
    setRejectionReason('');
  };
    const approvedData = [
        { id: 1, name: "Quaid-e-Azam Day", date: "25th Dec", datetype: "Working Day", appliesto: "Workspace Team", message: "wear green and white on this special day to show our unity and patriotism.", },
        { id: 2, name: "Quaid-e-Azam Day", date: "25th Dec", datetype: "Working Day", appliesto: "Workspace Team", message: "wear green and white on this special day to show our unity and patriotism.", },
        { id: 3, name: "Quaid-e-Azam Day", date: "25th Dec", datetype: "Working Day", appliesto: "Workspace Team", message: "wear green and white on this special day to show our unity and patriotism.", },
        { id: 4, name: "Quaid-e-Azam Day", date: "25th Dec", datetype: "Working Day", appliesto: "Workspace Team", message: "wear green and white on this special day to show our unity and patriotism.", },
        { id: 5, name: "Quaid-e-Azam Day", date: "25th Dec", datetype: "Working Day", appliesto: "Workspace Team", message: "wear green and white on this special day to show our unity and patriotism.", },
    ];







    return (
        <div className="container mt-5">
            <div className="d-flex flex-wrap justify-content-end gap-2 mb-4">
                <button className="btn g-btn px-3 " onClick={() => setShowModal(true)}>
                    <span className="fw-bold">+</span> Add Holiday
                </button>
                <button className="btn g-btn px-3 " onClick={() => setshowDelModal(true)}>
                    <span className="fw-bold">+</span> Add Holiday
                </button>
            </div>
            <FilterMultiSelects />

           
                <div className="table-responsive g-table-wrap g-t-scroll">
                    <Table hover className="text-center g-table" style={{ minWidth: "1500px" }}>
                        <thead>
                            <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                                <th>Name</th>
                                <th>Date</th>
                                <th>Day Type</th>
                                <th>Applies to</th>
                                <th>Message</th>
                                <th>Action</th>

                            </tr>
                        </thead>
                        <tbody>
                            {approvedData.map((member) => (
                                <tr>

                                    <td>{member.name}</td>
                                    <td>{member.date}</td>
                                    <td>{member.datetype}</td>
                                    <td>{member.appliesto}</td>
                                    <td>{member.message}</td>


                                    <td>
                                        <button className="btn btn-sm btn-outline-primary me-2">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(member)}>
                                            <FontAwesomeIcon icon={faTrashAlt} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            

            {/* Rejection Modal */}
            {showModal && (
                <>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        Add Holiday
                    </button>

                    {showModal && (
                        <div
                            className="modal fade show"
                            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            tabIndex={-1}
                        >
                            <div className="modal-dialog">
                                <div className="modal-content shadow rounded-3">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Add Holiday</h5>
                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={() => setShowModal(false)}
                                        ></button>
                                    </div>

                                    <div className="modal-body">
                                        {/* Holiday Type */}
                                        <div className="mb-3">
                                            <label className="form-label">Holiday Type</label><br />
                                            <div className="form-check form-check-inline">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    value="Holiday"
                                                    checked={holidayType === 'Holiday'}
                                                    onChange={() => setHolidayType('Holiday')}
                                                />
                                                <label className="form-check-label">Holiday</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    value="Memorial Day"
                                                    checked={holidayType === 'Memorial Day'}
                                                    onChange={() => setHolidayType('Memorial Day')}
                                                />
                                                <label className="form-check-label">Memorial Day</label>
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div className="mb-3">
                                            <label className="form-label">Name</label>
                                            <input className="form-control" placeholder="Holiday Name" />
                                        </div>

                                        {/* Date */}
                                        <div className="mb-3">
                                            <label className="form-label">Date</label>
                                            <DatePicker
                                                className="form-control"
                                                placeholderText="Start Date - End Date"
                                                selected={startDate}
                                                onChange={(date) => setStartDate(date)}
                                                isClearable
                                            />
                                        </div>

                                        {/* Team Scope */}
                                        <div className="mb-3">
                                            <label className="form-label">Team Scope</label>
                                            <Dropdown
                                                value={teamScope}
                                                onChange={(e) => setTeamScope(e.value)}
                                                options={teamScopeOptions}
                                                placeholder="Select Scope"
                                                className="w-100"
                                            />
                                        </div>

                                        {/* Team */}
                                        <div className="mb-3">
                                            <label className="form-label">Team</label>
                                            <Dropdown
                                                value={team}
                                                onChange={(e) => setTeam(e.value)}
                                                options={teamOptions}
                                                placeholder="Select Team"
                                                className="w-100"
                                            />
                                        </div>

                                        {/* Work Type */}
                                        <div className="mb-3">
                                            <label className="form-label">Work Type</label><br />
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="workType"
                                                    defaultChecked
                                                />
                                                <label className="form-check-label">Non-working</label>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div className="mb-3">
                                            <label className="form-label">Message</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                placeholder="Message"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-footer">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Close
                                        </button>
                                        <button className="btn btn-primary" onClick={handleSubmit}>
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

{/* Rejection Modal */}
      {showDelModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <h5 className="mb-3">Are you sure you want to delete Eid holiday?</h5>
               
                <div className="d-flex justify-content-between">
                  <button className="btn btn-light" onClick={handleClose}>No. keep it </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      console.log("Rejected:", selectedMember, "Reason:", rejectionReason);
                      handleClose();
                    }}
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        .modal {
          overflow-y: auto;
        }
      `}</style>
        </div>
    );
}
