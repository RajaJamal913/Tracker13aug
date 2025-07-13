'use client';
import { useState, useEffect } from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';

export default function Home() {
  const [mainTime, setMainTime] = useState(0);
  const [mainRunning, setMainRunning] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Break Policy Form States
  const [breakName, setBreakName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [applyToNew, setApplyToNew] = useState(false);
  const [maxMinPerDay, setMaxMinPerDay] = useState('');
  const [type, setType] = useState(null);

  // Sample Members & Type Options
  const members = [
    { name: 'Alice', code: 'A1' },
    { name: 'Bob', code: 'B2' },
    { name: 'Charlie', code: 'C3' },
  ];
  const typeOptions = [
    { label: 'Paid', value: 'Paid' },
    { label: 'Unpaid', value: 'Unpaid' },
  ];

  // Main Timer Logic
  useEffect(() => {
    // build change 
    //  let timer;
    let timer: ReturnType<typeof setInterval>;
    if (mainRunning && !isOnBreak) {
      timer = setInterval(() => setMainTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mainRunning, isOnBreak]);

 //  build change 
  //  const formatTime = (sec) => {
  const formatTime = (sec: number) => {
     const mins = String(Math.floor(sec / 60)).padStart(2, '0');
     const secs = String(sec % 60).padStart(2, '0');
     return `00:${mins}:${secs}`;
   };

  const handleTimerClick = () => {
    if (mainRunning) {
      setMainRunning(false);
      setMainTime(0);
    } else {
      setMainRunning(true);
    }
  };

  const handleBreakButtonClick = () => {
    if (!isOnBreak) {
      setIsBreakModalOpen(true);
    } else {
      setIsOnBreak(false);
      setMainRunning(true);
      setSelectedBreak('');
    }
  };

  const handleStartBreak = () => {
    if (selectedBreak) {
      setIsBreakModalOpen(false);
      setIsOnBreak(true);
      setMainRunning(false);
    } else {
      alert('Please select a break option.');
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    alert('Break policy deleted!');
  };

  return (
    <div className="container py-4">
      {/* Time Tracker */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <h5 className="mb-0">Time Tracker</h5>
        <div className="border rounded px-3 py-2 bg-light d-flex align-items-center">
          <span className="me-2">{formatTime(mainTime)}</span>
          <button  style={{
            backgroundColor: '#c084f5',
            width: '32px',
            height: '32px',
            border: 'none',
            outline: 'none',
          }}
            className={`btn p-0 rounded-circle d-flex align-items-center justify-content-center btn-${mainRunning ? 'danger' : 'primary'} me-1`}
            onClick={handleTimerClick}
          >
            {/* {mainRunning ? 'Stop' : 'Start'} */}
             <i className={`pi ${mainRunning ? 'pi-pause' : 'pi-play'} text-white`}></i>
          </button>
        </div>
        <button className="btn btn-warning btn-sm" onClick={handleBreakButtonClick}>
          {isOnBreak ? 'Stop Break' : 'Take Break'}
        </button>
      </div>

      {/* Break Policy Section */}
      <div className="card border-0 shadow-sm">
        <div className="card-header text-white fw-bold" style={{ backgroundColor: '#a855f7' }}>
          Break Policy
        </div>
        <div className="card-body">
          <div className="mb-3 text-end">
            <button className="btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#breakModal">
              + Create new Break
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered text-center">
              <thead className="table-light">
                <tr>
                  <th>Break policy</th>
                  <th>Members</th>
                  <th>Max min per day</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tea Break</td>
                  <td>03</td>
                  <td>30</td>
                  <td>Paid</td>
                  <td>
                    <button className="btn btn-sm btn-link text-primary me-2">✏️</button>
                    <button className="btn btn-sm btn-link text-danger" onClick={() => setShowDeleteModal(true)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Break Modal */}
      <div className="modal fade" id="breakModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content p-4">
            <h4 className="mb-4">Create Break Policy</h4>

            <div className="mb-3">
              <label className="form-label">Name</label>
              <InputText
                className="w-100"
                placeholder="Break name"
                value={breakName}
                onChange={(e) => setBreakName(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Members</label>
              <MultiSelect
                value={selectedMembers}
                options={members}
                onChange={(e) => setSelectedMembers(e.value)}
                optionLabel="name"
                placeholder="Select members"
                className="w-100"
              />
              <div className="form-check mt-2">
                <Checkbox
                  inputId="applyNew"
                  checked={applyToNew}
                //  build change 
                  // onChange={(e) => setApplyToNew(e.checked)}
                   onChange={(e) => setApplyToNew(e.checked as boolean)}
                />
                <label htmlFor="applyNew" className="form-check-label ms-2">
                  Apply to newly added members, too
                </label>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Max min per day</label>
                <input
                  className="form-control"
                  value={maxMinPerDay}
                  onChange={(e) => setMaxMinPerDay(e.target.value)}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Type</label>
                <Dropdown
                  value={type}
                  options={typeOptions}
                  onChange={(e) => setType(e.value)}
                  placeholder="Select Type"
                  className="w-100"
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-3">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  console.log({
                    breakName,
                    selectedMembers,
                    applyToNew,
                    maxMinPerDay,
                    type,
                  });
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start Break Modal */}
      {isBreakModalOpen && (
        <>
          <div className="modal show fade d-block" tabIndex={-1}>
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Select Break Type</h5>
                  <button type="button" className="btn-close" onClick={() => setIsBreakModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="teaBreak"
                      checked={selectedBreak === 'Tea Break'}
                      onChange={() => setSelectedBreak('Tea Break')}
                    />
                    <label className="form-check-label" htmlFor="teaBreak">
                      Tea Break
                    </label>
                  </div>
                  <div className="form-check mt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="mealBreak"
                      checked={selectedBreak === 'Meal Break'}
                      onChange={() => setSelectedBreak('Meal Break')}
                    />
                    <label className="form-check-label" htmlFor="mealBreak">
                      Meal Break
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={handleStartBreak}>
                    Start Break
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsBreakModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="modal show fade d-block" tabIndex={-1}>
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete the break policy?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}
