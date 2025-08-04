'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';

import { Table, Form } from "react-bootstrap";

import FilterMultiSelects from '@/components/FilterMultiSelects';

export default function SalaryReport() {
  const [activeTab, setActiveTab] = useState('daily');

  // for members table 
  const [daily, setDaily] = useState([
    { name: "Jamal Raja", totaltime: "12hr 41min", date:"12-06-25", currency: "USD", hourlyrate: "0", totalamount: "0", status:"NA" },
    { name: "Jamal Raja", totaltime: "12hr 41min", date:"12-06-25", currency: "USD", hourlyrate: "7", totalamount: "0", status:"NA" },
    { name: "Jamal Raja", totaltime: "12hr 41min", date:"12-06-25", currency: "USD", hourlyrate: "mixed", totalamount: "100", status:"NA" },
    { name: "Jamal Raja", totaltime: "12hr 41min", date:"12-06-25", currency: "USD", hourlyrate: "5", totalamount: "10", status:"NA"},
    { name: "Jamal Raja", totaltime: "12hr 41min", date:"12-06-25", currency: "USD", hourlyrate: "0", totalamount: "0", status:"NA" },
  ]);

 

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedTime, setSelectedTime] = useState('By Day');
  const exportOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'XLSX', value: 'xlsx' },
    { label: 'PDF', value: 'pdf' }
  ];
  // for select box and dd 


  return (
    <div className="container mt-5">
      <div className="row mb-4">
        <div className="col-lg-12 d-flex justify-content-between align-items-center gap-2">
          <h2 className="page-heading-wrapper">salary-report</h2>
          <div className="d-flex justify-content-between align-items-center gap-2">
            
            <button className="btn g-btn">Export</button>
          </div>
        </div>
      </div>
      <div className="row mb-4">
        <div className="col-lg-12">
          <FilterMultiSelects />
        </div>
      </div>
      <div className="row">
        <div className="col-lg-12">
          <div className="table-responsive g-table-wrap g-t-scroll">
            <Table hover className="text-center g-table">
              <thead>
                <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                  <th>Nameee</th>
                  <th>Total Tracked Time</th>
                  <th>Date</th>
                  <th>Currency</th>
                  <th>Hourly Rate</th>
                  <th>Total Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((member, index) => (
                  <tr key={index}>
                    <td>{member.name}</td>
                    <td>{member.totaltime}</td>
                    <td>{member.date}</td>
                    <td>{member.currency}</td>
                    <td>{member.hourlyrate}</td>
                    <td>{member.totalamount}</td>
                    <td>{member.status}</td>
                    {/* <td>
                      <Dropdown
                        value={member.exportformat}
                        options={exportOptions}
                        onChange={(e) => handleExportChange(e.value, index)}
                        placeholder="Select Export Format"
                        className="w-full md:w-14rem"
                      />
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

        </div>
      
      </div>
    </div>
  );
}
