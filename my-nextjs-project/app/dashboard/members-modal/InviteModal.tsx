'use client';
import { useState } from 'react';


export default function InviteModal({ show, handleClose, handleInvite }: {
    show: boolean;
    handleClose: () => void;
    handleInvite: (data: { firstName: string; lastName: string; email: string }) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

 const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleInvite({ firstName, lastName, email });
    setFirstName('');
    setLastName('');
    setEmail('');
    handleClose(); // close modal after submit
  };

  return (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: show ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-3">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">Invite Project Viewer</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                type="email"
                className="form-control mb-2"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="modal-footer border-0">
              <button type="submit" className="btn btn-primary w-100" style={{ backgroundColor: '#7F56D9' }}>
                Invite
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
