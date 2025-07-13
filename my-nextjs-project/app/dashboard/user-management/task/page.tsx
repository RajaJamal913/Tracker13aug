// usr-mgt task 

'use client'
import { useState } from 'react'


export default function Home() {
  // build change 
  // const [openStatuses, setOpenStatuses] = useState([])
  const [openStatuses, setOpenStatuses] = useState<string[]>([])
  const [showAddInput, setShowAddInput] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const addStatus = () => {
    if (!newStatus.trim()) return
    setOpenStatuses(s => [...s, newStatus.trim()])
    setNewStatus('')
    setShowAddInput(false)
  }
// build change 
  // const deleteStatus = idx => {
  //   setOpenStatuses(s => s.filter((_, i) => i !== idx))
  // }
  const deleteStatus = (idx: number) => { // Add type for idx parameter
    setOpenStatuses(s => s.filter((_, i) => i !== idx))
  }
  return (
    <div className="container py-5">
      <h5>Open statuses</h5>
      <div className="mb-3">
        {openStatuses.map((status, idx) => (
          <div
            key={idx}
            className="d-flex align-items-center justify-content-between mb-2 p-2 border rounded"
            style={{ maxWidth: '350px' }}
          >
            <span className="me-2" style={{ cursor: 'grab' }}>☰</span>
            <span className="flex-grow-1 text-uppercase">{status}</span>
            <div className="dropdown">
              <button
                className="btn btn-sm btn-light"
                type="button"
                id={`dropdownMenu${idx}`}
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                ⋮
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={`dropdownMenu${idx}`}>
                <li>
                  <button className="dropdown-item text-danger" onClick={() => deleteStatus(idx)}>
                    Delete
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ))}

        {/* + Add status */}
        {!showAddInput && (
          <button
            className="btn btn-sm"
            style={{ backgroundColor: '#6f42c1', color: 'white' }}
            onClick={() => setShowAddInput(true)}
          >
            + Add status
          </button>
        )}

        {/* Input + Confirm/Cancel */}
        {showAddInput && (
          <div className="d-flex align-items-center gap-2 mt-2" style={{ maxWidth: '350px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="New status"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" onClick={addStatus}>
              Add
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setShowAddInput(false)
                setNewStatus('')
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* you can repeat the same pattern for Active & Done */}
      <h5 className="mt-4">Active statuses</h5>
      <div className="mb-3">
        {/* hard-coded example: */}
        <div className="d-flex align-items-center mb-2 p-2 border rounded" style={{ maxWidth: '350px' }}>
          <span className="me-2" style={{ cursor: 'grab' }}>☰</span>
          <span className="flex-grow-1 text-uppercase">In Progress</span>
        </div>
      </div>

      <h5>Done statuses</h5>
      <div>
        {/* hard-coded example: */}
        <div className="d-flex align-items-center mb-2 p-2 border rounded" style={{ maxWidth: '350px' }}>
          <span className="me-2" style={{ cursor: 'grab' }}>☰</span>
          <span className="flex-grow-1 text-uppercase">Done</span>
        </div>
      </div>
    </div>
  )
}
