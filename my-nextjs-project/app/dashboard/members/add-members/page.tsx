"use client";

import { useState } from "react";
import { Table, Form } from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle, FaPaperPlane } from 'react-icons/fa';


import 'primereact/resources/themes/lara-light-blue/theme.css'; // or another theme
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { MultiSelect } from 'primereact/multiselect';
import { BiUpload } from "react-icons/bi";



import { Button, InputGroup, FormControl } from 'react-bootstrap';

export default function members() {

  // Use States 

  const [activeTab, setActiveTab] = useState("members");
  const [activeTab2, setActiveTab2] = useState("email");
  const [showModal, setShowModal] = useState(false);

  const [memberLimit, setMemberLimit] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  
  // for members table 
  const membersActivityData = [
    { member: "Sajjal Fatima", email: "sajjal@gmail.com", team: "Development", project: "Ecommerce" },
    { member: "Hamza", email: "Hamza.com", team: "Designing", project: "Ecommerce" },
    { member: "Usman", email: "Usman@gmail.com", team: "QA", project: "Ecommerce" },
  ];

  const [search, setSearch] = useState("");

  // const filteredActivities = membersActivityData.filter((activity) =>
  //   activity.assignedTo.toLowerCase().includes(search.toLowerCase())
  // );
  // for members table 

// for MultiSelect selectbox 
const [selectedCities, setSelectedCities] = useState([]);

const cities = [
    { name: 'Development Team', code: 'DT' },
    { name: 'Product Management', code: 'PM' },
    { name: 'Quality Assurance (QA)', code: 'QA' }
    
];


const [selectedProject, setSelectedProject] = useState([]);

const projects = [
    { name: 'Getting Started with WewWizTracker', code: 'DT' }
   
    
];
// for MultiSelect selectbox 


// for file Upload
// const [file, setFile] = useState(null);

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0]);
//   };

// build change
const [file, setFile] = useState<File | null>(null);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
    }
}; 

// for file Upload 

// for copy links in invide modal 
const [copied, setCopied] = useState(false);
  const inviteLink = "https://www.webwork-tracker.com/app/join-invite/abc123";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  // for copy links in invide modal 


// for on bording tab 
const data = [
  {
    initials: 'HR',
    email: 'Hamzaraheed@gmail.com',
    accepted: true,
    loggedIn: false,
    trackedTime: false,
  },
  {
    initials: 'MA',
    email: 'Mirzaamnad@gmail.com',
    accepted: false,
    loggedIn: false,
    trackedTime: false,
  },
];
// for on bording tab 




  return (
    <div className="container-fluid">
       

        <div className="row mt-3">
      
      <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
        <div className="d-flex align-items-center">
          {/* Members Tab */}
          <button
            className={`btn border-0 fw-bold ${
              activeTab === "members" ? "text-primary position-relative" : "text-muted"
            }`}
            onClick={() => setActiveTab("members")}
          >
            Members <span className="badge bg-light text-dark">1</span>
            {activeTab === "members" && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
            )}
          </button>

          {/* Onboarding Status Tab */}
          <button
            className={`btn border-0 fw-bold mx-3 ${
              activeTab === "onboarding" ? "text-primary position-relative" : "text-muted"
            }`}
            onClick={() => setActiveTab("onboarding")}
          >
            Onboarding Status
            {activeTab === "onboarding" && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
            )}
          </button>

          {/* Archived Tab */}
          <button
            className={`btn border-0 fw-bold ${
              activeTab === "archived" ? "text-primary position-relative" : "text-muted"
            }`}
            onClick={() => setActiveTab("archived")}
          >
            Archived
            {activeTab === "archived" && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
            )}
          </button>
        </div>

        {/* Invite Button */}
        <button className="btn btn-sm text-white" style={{ backgroundColor: "#A463F2" }}>
          + Invite
        </button>
      </div>

      <div className="mt-3">
        {activeTab === "members" && <div className="p-3 border rounded">
          {/* Table */}
                     <div className="table-responsive g-table-wrap g-t-scroll">
                       <Table hover className="text-center g-table">
                         <thead>
                           <tr className="text-white" style={{ backgroundColor: "#A54EF5" }}>
                           <th>Members</th>
                       <th>Email</th>
                       <th>Team</th>
                       <th>project</th>
                       
                           </tr>
                         </thead>
                         <tbody>
                         {membersActivityData.map((data, index) => (
            <tr key={index} className="text-center">
            
              <td className="border border-gray-300 px-4 py-2">{data.member}</td>
              <td className="border border-gray-300 px-4 py-2">{data.email}</td>
              <td className="border border-gray-300 px-4 py-2">{data.team}</td>
              <td className="border border-gray-300 px-4 py-2">{data.project}</td>
            </tr>
          ))}
                   </tbody>
                       </Table>
                     </div>
          </div>}
        {activeTab === "onboarding" && <div className="p-3 border rounded">
          <div className="container mt-4">
      {/* Top Summary Component */}
      <div className="border rounded p-3 mb-4 d-flex justify-content-between text-center">
        <div>
          <strong>Invitation Sent</strong>
          <div>02</div>
        </div>
        <div>
          <strong>Invitation Accepted</strong>
          <div>01</div>
        </div>
        <div>
          <strong>Tracked Time</strong>
          <div>00</div>
        </div>
        <div>
          <strong>Outdated Tracker</strong>
          <div>00</div>
        </div>
      </div>

      {/* Table Component */}
      <div className="table-responsive g-table-wrap g-t-scroll">
      <Table bordered hover className="text-center text-center g-table table table-hover" style={{ backgroundColor: '#d8b6ff' }}>
        <thead style={{ backgroundColor: '#a34efc', color: 'white' }}>
          <tr>
            <th>Email</th>
            <th>Accepted Invitation</th>
            <th>Logged In</th>
            <th>Tracked Time</th>
            <th>Send Reminder</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, index) => (
            <tr key={index}>
              <td>
                <span className="badge bg-light text-dark me-2" style={{ padding: '10px' }}>{user.initials}</span>
                {user.email}
              </td>
              <td className="text-center">{user.accepted ? <FaCheckCircle color="green" /> : <FaTimesCircle color="red" />}</td>
              <td className="text-center">{user.loggedIn ? <FaCheckCircle color="green" /> : <FaTimesCircle color="red" />}</td>
              <td className="text-center">{user.trackedTime ? <FaCheckCircle color="green" /> : <FaTimesCircle color="red" />}</td>
              <td>
                <FaPaperPlane color="#a34efc" style={{ cursor: 'pointer' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
    </div>
          
          </div>}
        {activeTab === "archived" && <div className="p-3 border rounded">📂 Archived Records</div>}
      </div>
    </div>

    <div className="container mt-3">
      {/* Invite Button to Open Modal */}
      <button
        className="btn btn-sm text-white"
        style={{ backgroundColor: "#A463F2" }}
        onClick={() => setShowModal(true)}
      >
        + Invite
      </button>

      {/* Invite Members Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-xl">
            <div className="modal-content p-3">
              {/* Modal Header */}
              <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                <h5 className="fw-bold">Invite Members</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              {/* Tab Links */}
              <div className="d-flex mb-3">
                <button
                  className={`btn border-0 fw-bold ${
                    activeTab2 === "email" ? "text-primary position-relative" : "text-muted"
                  }`}
                  onClick={() => setActiveTab2("email")}
                >
                  By Email
                  {activeTab2 === "email" && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
                  )}
                </button>

                <button
                  className={`btn border-0 fw-bold mx-3 ${
                    activeTab2 === "bulk" ? "text-primary position-relative" : "text-muted"
                  }`}
                  onClick={() => setActiveTab2("bulk")}
                >
                  Bulk Invite
                  {activeTab2 === "bulk" && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
                  )}
                </button>

                <button
                  className={`btn border-0 fw-bold ${
                    activeTab2 === "link" ? "text-primary position-relative" : "text-muted"
                  }`}
                  onClick={() => setActiveTab2("link")}
                >
                  Copy Link
                  {activeTab2 === "link" && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeTab2 === "email" && (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="fw-bold">Email</label>
                      <input type="email" className="form-control" placeholder="Example@gmail.com" />
                    </div>
                    <div className="col-md-4">
                      <label className="fw-bold">Team</label>
                      <div className="g-multiselect-wrapper">
            <MultiSelect
                value={selectedCities}
                options={cities}
                onChange={(e) => setSelectedCities(e.value)}
                optionLabel="name"
                placeholder="Select Team"
                filter
                display="chip" // shows selected values as chips
                className="w-full md:w-20rem"
            />
        </div>
                    </div>

                    <div className="col-md-4">
                      <label className="fw-bold">Project</label>
                      <div className="g-multiselect-wrapper">
            <MultiSelect
                value={selectedProject}
                options={projects}
                onChange={(e) => setSelectedProject(e.value)}
                optionLabel="name"
                placeholder="Select Project"
                filter
                display="chip" // shows selected values as chips
                className="w-full md:w-20rem"
            />
        </div>

        
                    </div>
                  </div>
                  <a href="#" className="text-primary">+ Add Email</a>
                </div>
              )}

              {activeTab2 === "bulk" && (
                <div className="text-center p-3 border rounded"><div className="mt-3">
                <p>
                  Upload <strong>CSV</strong>, <strong>XLSX</strong>, or <strong>XLSV</strong> files by following our{' '}
                  <a href="#" className="text-primary text-decoration-none">template format</a>.
                </p>
          
                <Form.Group controlId="formFile">
                  <Form.Control
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                  />
                </Form.Group>
          
                {file && <p className="mt-2 text-success">Selected File: {file.name}</p>}
              </div></div>
              )}

              {activeTab2 === "link" && (
                <div className="text-center p-3 border rounded"><div className="mt-3">
                <p>Copy the link to this workspace and send to members:</p>
          
                <InputGroup>
                  <FormControl
                    readOnly
                    value={inviteLink}
                    className="rounded-start"
                  />
                  <Button
                    variant="primary"
                    onClick={handleCopy}
                    className="rounded-end"
                  >
                    <i className="bi bi-clipboard"></i> {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </InputGroup>
                
              </div></div>
              )}

              {/* Footer Buttons */}
              <div className="d-flex justify-content-end mt-3">
                <button className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn text-white" style={{ backgroundColor: "#A463F2" }}>Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
    </div>


  );
}
