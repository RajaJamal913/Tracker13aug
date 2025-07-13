// time counter 
'use client';
import { useState, useEffect } from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min';


export default function TimeCount() {
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
    <div className="container">
   
      {/* Time Tracker */}
      <div className="d-flex align-items-center gap-3 mb-4">
    
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
    </div>
  );
}
