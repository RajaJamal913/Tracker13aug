'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { FaDollarSign, FaPlus, FaSyncAlt, FaTrashAlt } from 'react-icons/fa';

export default function InvitePage() {
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
// build change 

  // const handleInvite = (e) => {
  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({ firstName, lastName, email });

    // Clear form and close modal
    setFirstName('');
    setLastName('');
    setEmail('');
    setShowModal(false);
  };

  return (
    <div className="container mt-5">
      <button className="g-btn" style={{backgroundColor:"rgb(164, 99, 242)", color:"white"}} onClick={() => setShowModal(true)}>
        Invite Project Viewer
      </button>
      <div className="container mt-5">
      <div className="table-responsive g-table-wrap">
        <table className="table align-middle g-table">
          <thead className="bg-light">
            <tr>
              <th className="fw-bold">Full name/Email</th>
              <th className="fw-bold text-center">Show Rates</th>
              <th className="fw-bold text-center">Projects</th>
              <th className="fw-bold text-center">Member since</th>
              <th className="fw-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Avatar & Name */}
              <td>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex justify-content-center align-items-center"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#94b3df',
                      color: '#fff',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    aa
                  </div>
                  <div>
                    <div className="fw-semibold">aaa aaa</div>
                    <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                      sasasa@gmail.com
                    </div>
                  </div>
                </div>
              </td>

              {/* Show Rates */}
              <td className="text-center">
                <span
                  className="badge rounded bg-success text-white"
                  style={{ fontSize: '0.75rem' }}
                >
                  <FaDollarSign />
                </span>
              </td>

              {/* Projects */}
              <td className="text-center">
                <span
                  className="badge rounded bg-light text-primary"
                  style={{ backgroundColor: '#E9D7FE', fontSize: '0.75rem' }}
                >
                  <FaPlus />
                </span>
              </td>

              {/* Member Since */}
              <td className="text-center text-muted">Apr 09, 2025</td>

              {/* Actions */}
              <td className="text-center">
                <div className="d-flex">
                <FaSyncAlt className="me-3 text-secondary" style={{ cursor: 'pointer' }} />
                <FaTrashAlt className="text-danger" style={{ cursor: 'pointer' }} />

                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>





      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-3">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Invite Project Viewer</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleInvite}>
                <div className="modal-body">
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="First Name"
                    value={firstName}
                    // build changes 
                    // onChange={(e) => setFirstName(e.target.value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Last Name"
                    value={lastName}
                     // build changes
                    // onChange={(e) => setLastName(e.target.value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} 
                    required
                  />
                  <input
                    type="email"
                    className="form-control mb-2"
                    placeholder="Email"
                    value={email}
                     // build changes
                    // onChange={(e) => setEmail(e.target.value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="submit"
                    className="btn w-100 text-white"
                    style={{ backgroundColor: '#7F56D9' }}
                  >
                    Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



