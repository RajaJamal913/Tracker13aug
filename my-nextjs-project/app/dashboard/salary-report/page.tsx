'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Table, Form } from "react-bootstrap";
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import FilterMultiSelects from '@/components/FilterMultiSelects';

export default function SalaryReport() {
    const [activeTab, setActiveTab] = useState('daily');

    // for members table 
   const [daily, setDaily] = useState([
    { name: "Jamal Raja", totaltime: "12hr 41min", currency: "USD", hourlyrate: "0", totalamount: "0", exportformat: "" },
    { name: "Jamal Raja", totaltime: "12hr 41min", currency: "USD", hourlyrate: "7", totalamount: "0", exportformat: "" },
    { name: "Jamal Raja", totaltime: "12hr 41min", currency: "USD", hourlyrate: "mixed", totalamount: "100", exportformat: "" },
    { name: "Jamal Raja", totaltime: "12hr 41min", currency: "USD", hourlyrate: "5", totalamount: "10", exportformat: "" },
    { name: "Jamal Raja", totaltime: "12hr 41min", currency: "USD", hourlyrate: "0", totalamount: "0", exportformat: "" },
  ]);
   
const handleExportChange = (value: string, index: number) => {
    const updated = [...daily];
    updated[index].exportformat = value;
    setDaily(updated);
  };


    // for members table 


    // for select box and dd 

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
            <div className="row">
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
            <th>Name</th>
            <th>Total Time</th>
            <th>Currency</th>
            <th>Hourly Rate</th>
            <th>Total Amount</th>
            <th>Export Format</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((member, index) => (
            <tr key={index}>
              <td>{member.name}</td>
              <td>{member.totaltime}</td>
              <td>{member.currency}</td>
              <td>{member.hourlyrate}</td>
              <td>{member.totalamount}</td>
              <td>
                <Dropdown
                  value={member.exportformat}
                  options={exportOptions}
                  onChange={(e) => handleExportChange(e.value, index)}
                  placeholder="Select Export Format"
                  className="w-full md:w-14rem"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>

    </div>
    <div className="col-lg-12 text-end">
        <button className='btn g-btn'>Export</button>
    </div>
</div>
        </div>
    );
}
