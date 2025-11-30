'use client';

import { useState } from 'react';
import { Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import FilterMultiSelects from '@/components/FilterMultiSelects'
import { Dropdown } from 'primereact/dropdown';


export default function ProfileTabs() {

interface Member {
  id: number;
  members: string;
  team: string;
  policy: string;
  Reason: string;
  paid: string;
  createdOn: string;
  createdby: string;
  approvedby: string;
  start: string;
  end: string;
  total: string;
  rejectionreason?: string;
}


  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  // const [selectedMember, setSelectedMember] = useState(null);
    // build fix 
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMemberModal, setshowAddMemberModal] = useState(false);
const [form, setForm] = useState({
  policy: '',
  date: '',
  duration: '',
  reason: ''
});


const leavePolicies = [
  { label: 'Leave', value: 'Leave' },
  { label: 'Sick Leave', value: 'Sick Leave' }
];

const leaveDurations = [
  { label: 'Full day', value: 'Full day' },
  { label: 'Half day', value: 'Half day' }
];
const addMembers = [
  { label: 'Member1', value: 'Member1' },
  { label: 'Member2', value: 'Member2' }
];


  const pendingData = [
    { id: 1, members: "Hamza", team: "Team Lead", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"6 days" },
    { id: 2, members: "Ali", team: "Developer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"6 days" },
    { id: 3, members: "Usman", team: "UX Designer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"6 days" },
    { id: 4, members: "Anees", team: "QA Engineer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"6 days" },
    { id: 5, members: "Azam", team: "Marketing", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"6 days" },
  ];
  const approvedData = [
    { id: 1, members: "Hamza", team: "Team Lead", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 2, members: "Ali", team: "Developer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 3, members: "Usman", team: "UX Designer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 4, members: "Anees", team: "QA Engineer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 5, members: "Azam", team: "Marketing", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
  ];

  const rejectedData = [
    { id: 1, members: "Hamza", team: "Team Lead", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25",rejectionreason:"asdfghj", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 2, members: "Ali", team: "Developer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25",rejectionreason:"asdfghj", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 3, members: "Usman", team: "UX Designer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25",rejectionreason:"asdfghj", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 4, members: "Anees", team: "QA Engineer", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25",rejectionreason:"asdfghj", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
    { id: 5, members: "Azam", team: "Marketing", policy: "Leave", Reason: "Family Gather and have to go out of city", paid: "Yes", createdOn:"Apr-5-25",rejectionreason:"asdfghj", createdby:"hamza", approvedby:"Hamza", start:"Apr-5-25", end:"Apr-7-25", total:"3 days" },
  ];

  // const handleDeleteClick = (member) => {
  //   setSelectedMember(member);
  //   setShowModal(true);
  // };
  // build fix 
const handleDeleteClick = (member: Member) => {  // Add type annotation
    setSelectedMember(member);
    setShowModal(true);
};


  const handleClose = () => {
    setShowModal(false);
    setRejectionReason('');
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'pending':
        return (
         <>
            <div className="table-responsive g-table-wrap g-t-scroll">
              <Table hover className="text-center g-table" style={{minWidth:"1500px"}}>
                <thead>
                  <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                    <th>Members</th>
                    <th>Team</th>
                    <th>Policy</th>
                    <th>Reason</th>
                    <th>Paid</th>
                    <th>Created On</th>
                    <th>Created By</th>
                    <th>Approved By</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Total</th>
                    
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedData.map((member) => (
                    <tr>
                      <td className="fw-bold">{member.members}</td>
                      <td>{member.team}</td>
                      <td>{member.policy}</td>
                      <td>{member.Reason}</td>
                      <td>{member.paid}</td>
                      <td>{member.createdOn}</td>
                      <td>{member.createdby}</td>
                      <td>{member.approvedby}</td>
                      <td>{member.start}</td>
                      <td>{member.end}</td>
                      <td>{member.total}</td>
                     
                      <td>
                        <div className="d-flex align-items-center ">
<button className="btn btn-sm btn-outline-primary me-2">
                          <FontAwesomeIcon icon={faCheck} />

                        </button>
                        <button className="btn btn-sm btn-outline-primary me-2">
                         <FontAwesomeIcon icon={faTimes} />

                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(member)}>
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                        </div>
                        
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        );
      case 'approved':
        return (
          <>
            <div className="table-responsive g-table-wrap g-t-scroll">
              <Table hover className="text-center g-table" style={{minWidth:"1500px"}}>
                <thead>
                  <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                    <th>Members</th>
                    <th>Team</th>
                    <th>Policy</th>
                    <th>Reason</th>
                    <th>Paid</th>
                    <th>Created On</th>
                    <th>Created By</th>
                    <th>Approved By</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedData.map((member) => (
                    <tr key={member.id}>
                      <td className="fw-bold">{member.members}</td>
                      <td>{member.team}</td>
                      <td>{member.policy}</td>
                      <td>{member.Reason}</td>
                      <td>{member.paid}</td>
                      <td>{member.createdOn}</td>
                      <td>{member.createdby}</td>
                      <td>{member.approvedby}</td>
                      <td>{member.start}</td>
                      <td>{member.end}</td>
                      <td>{member.total}</td>
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
          </>
        );
      case 'rejected':
        return (
            <>
            <div className="table-responsive g-table-wrap g-t-scroll">
              <Table hover className="text-center g-table" style={{minWidth:"1500px"}}>
                <thead>
                  <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                    <th>Members</th>
                    <th>Team</th>
                    <th>Policy</th>
                    <th>Reason</th>
                    <th>Paid</th>
                    <th>Created On</th>
                    <th>Rejection Reason</th>
                    <th>Created By</th>
                    <th>Approved By</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedData.map((member) => (
                    <tr key={member.id}>
                      <td className="fw-bold">{member.members}</td>
                      <td>{member.team}</td>
                      <td>{member.policy}</td>
                      <td>{member.Reason}</td>
                      <td>{member.paid}</td>
                      <td>{member.createdOn}</td>
                      <td>{member.rejectionreason}</td>
                      <td>{member.createdby}</td>
                      <td>{member.approvedby}</td>
                      <td>{member.start}</td>
                      <td>{member.end}</td>
                      <td>{member.total}</td>
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
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mt-5">
      {/* Tab Header */}
      <div className="tabContainer profile-settings-tabs-wrapper mb-4">
        <div className="um-btns-wrap d-flex">
          {['pending', 'approved', 'rejected'].map((tab) => (
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


<div className="d-flex flex-wrap justify-content-end gap-2 mb-4">
           
            <button className="btn btn-outline-secondary px-3">
                Balance
            </button>
            
           
            <button className="btn btn-outline-secondary px-3">
                Export
            </button>
            
           
            <button className="btn btn-outline-secondary px-3" onClick={() => setShowAddModal(true)}>
                Add leave for a member
            </button>
            
         
            <button className="btn g-btn px-3 " onClick={() => setShowAddModal(true)}>
                <span className="fw-bold">+</span> Add Leave
            </button>
        </div>
      <FilterMultiSelects/>

      {/* Form Card */}
      <div className="cardWrapper">{renderForm()}</div>

      {/* Rejection Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <h5 className="mb-3">Write the reason for rejection</h5>
                <textarea
                  className="form-control mb-4 border-primary"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                ></textarea>
                <div className="d-flex justify-content-between">
                  <button className="btn btn-light" onClick={handleClose}>Cancel</button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      console.log("Rejected:", selectedMember, "Reason:", rejectionReason);
                      handleClose();
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

 {showAddModal && (
  <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered" role="document">
      <div className="modal-content p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="modal-title">Request Leave</h5>
          <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
        </div>

        <form>
          <div className="mb-3">
            <label className="form-label fw-semibold">Leave Policy<span className="text-danger">*</span></label>
            <Dropdown
              value={form.policy}
              options={leavePolicies}
              onChange={(e) => setForm({ ...form, policy: e.value })}
              placeholder="Select Leave Policy"
              className="w-100"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Date<span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="Start Date - End Date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Leave duration<span className="text-danger">*</span></label>
            <Dropdown
              value={form.duration}
              options={leaveDurations}
              onChange={(e) => setForm({ ...form, duration: e.value })}
              placeholder="Select Duration"
              className="w-100"
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Reason<span className="text-danger">*</span></label>
            <textarea
              className="form-control"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-light" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                console.log("Leave Request:", form);
                setShowAddModal(false);
              }}
            >
              Request leave
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
 {showAddMemberModal && (
  <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered" role="document">
      <div className="modal-content p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="modal-title">Request Leave</h5>
          <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
        </div>

        <form>
          <div className="mb-3">
            <label className="form-label fw-semibold">Member<span className="text-danger">*</span></label>
            <Dropdown
              value={form.policy}
              options={leavePolicies}
              onChange={(e) => setForm({ ...form, policy: e.value })}
              placeholder="Select Leave Policy"
              className="w-100"
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Leave Policy<span className="text-danger">*</span></label>
            <Dropdown
              value={form.policy}
              options={addMembers}
              onChange={(e) => setForm({ ...form, policy: e.value })}
              placeholder="Select Leave Policy"
              className="w-100"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Date<span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="Start Date - End Date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Leave duration<span className="text-danger">*</span></label>
            <Dropdown
              value={form.duration}
              options={leaveDurations}
              onChange={(e) => setForm({ ...form, duration: e.value })}
              placeholder="Select Duration"
              className="w-100"
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Reason<span className="text-danger">*</span></label>
            <textarea
              className="form-control"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-light" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                console.log("Leave Request:", form);
                setShowAddModal(false);
              }}
            >
              Request leave
            </button>
          </div>
        </form>
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

        .modal {
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
