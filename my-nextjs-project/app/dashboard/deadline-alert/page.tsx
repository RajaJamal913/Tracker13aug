'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
export default function deadlinealert() {
    


    return (
        <div className="container mt-5">
           

            {/* Form Card */}
            <div className="cardWrapper">

                  <>

                        <div className="cardHeader d-flex justify-content-start align-items-center p-4">
                            <h5 className="cardTitle text-white m-0">Intelligent Deadline Alerts</h5>
                        </div>
                        <div className="switvh-btns-wrap p-4">
                            <h6 className="mb-3">Reports</h6>
                           
                            <div className="form-check form-switch mb-2">
                              <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="summaryReport">The task is approaching its deadline in 24 hours.</label>
                            </div>
                            <div className="form-check form-switch mb-4">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="trackedHours">Task is overdue by 1 day. Kindly take immediate action.</label>
                            </div>

                        
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="newProjects" />
                                <label className="form-check-label" htmlFor="newProjects">The deadline for task has been extended by the manager.</label>
                            </div>
                            
                        </div>
                    </>
            </div>

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

        .saveButton {
          background-color: #c084fc;
          color: white;
          padding: 0.5rem 1.25rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
        }
      `}</style>
        </div>
    );
}
