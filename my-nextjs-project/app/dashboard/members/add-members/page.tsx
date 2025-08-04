"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

import {
  Table,
  Button,
  InputGroup,
  FormControl,
  Modal,
} from "react-bootstrap";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaPaperPlane,
} from "react-icons/fa";
import { BiUpload } from "react-icons/bi";

// dynamically import MultiSelect so it only runs on client
const MultiSelect = dynamic<any>(
  () => import("primereact/multiselect").then((mod) => mod.MultiSelect),
  { ssr: false }
);

type CityOption = { name: string; code: string };
type ProjectOption = { name: string; code: string };
type MemberActivity = {
  member: string;
  email: string;
  team: string;
  project: string;
};
type OnboardingData = {
  initials: string;
  email: string;
  accepted: boolean;
  loggedIn: boolean;
  trackedTime: boolean;
};

export default function AddMembersPage() {
  // tab state
  const [activeTab, setActiveTab] = useState<
    "members" | "onboarding" | "archived"
  >("members");
  const [activeTab2, setActiveTab2] = useState<"email" | "bulk" | "link">(
    "email"
  );
  // modal state
  const [showModal, setShowModal] = useState(false);

  // dummy data
  const membersActivityData: MemberActivity[] = [
    {
      member: "Sajjal Fatima",
      email: "sajjal@gmail.com",
      team: "Development",
      project: "Ecommerce",
    },
    {
      member: "Hamza",
      email: "hamza.com",
      team: "Designing",
      project: "Ecommerce",
    },
    {
      member: "Usman",
      email: "usman@gmail.com",
      team: "QA",
      project: "Ecommerce",
    },
  ];

  const cities: CityOption[] = [
    { name: "Development Team", code: "DT" },
    { name: "Product Management", code: "PM" },
    { name: "Quality Assurance (QA)", code: "QA" },
  ];
  const projects: ProjectOption[] = [
    { name: "Getting Started with WewWizTracker", code: "GSW" },
  ];
  const [selectedCities, setSelectedCities] = useState<CityOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption[]>([]);

  // file upload
  const [file, setFile] = useState<File | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  // invite-link copy
  const [copied, setCopied] = useState(false);
  const inviteLink = "https://www.webwork-tracker.com/app/join-invite/abc123";
  const handleCopy = async () => {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  // onboarding dummy
  const onboardingData: OnboardingData[] = [
    {
      initials: "HR",
      email: "Hamzaraheed@gmail.com",
      accepted: true,
      loggedIn: false,
      trackedTime: false,
    },
    {
      initials: "MA",
      email: "Mirzaamnad@gmail.com",
      accepted: false,
      loggedIn: false,
      trackedTime: false,
    },
  ];

  return (
    <>
      {/* inject all CSS only on the client */}
      <Head>
        {/* Bootstrap */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-..."
          crossOrigin="anonymous"
        />
        {/* PrimeReact Theme */}
        <link
          href="https://cdn.jsdelivr.net/npm/primereact/resources/themes/lara-light-blue/theme.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/primereact/resources/primereact.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/primeicons/primeicons.css"
          rel="stylesheet"
        />
      </Head>

      <div className="container-fluid">
        {/* Tabs & Invite Button */}
        <div className="row mt-3">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
            <div className="d-flex align-items-center">
              {(["members", "onboarding", "archived"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`btn border-0 fw-bold ${
                    activeTab === tab
                      ? "text-primary position-relative"
                      : "text-muted"
                  }${tab === "members" ? "" : " ms-3"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "members"
                    ? "Members"
                    : tab === "onboarding"
                    ? "Onboarding Status"
                    : "Archived"}
                  {tab === "members" && (
                    <span className="badge bg-light text-dark ms-2">1</span>
                  )}
                  {activeTab === tab && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
                  )}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="text-white"
              style={{ backgroundColor: "#A463F2" }}
              onClick={() => setShowModal(true)}
            >
              + Invite
            </Button>
          </div>

          {/* Tab Contents */}
          <div className="mt-3">
            {activeTab === "members" && (
              <div className="p-3 border rounded">
                <div className="table-responsive">
                  <Table hover className="text-center">
                    <thead style={{ backgroundColor: "#A54EF5", color: "white" }}>
                      <tr>
                        <th>Members</th>
                        <th>Email</th>
                        <th>Team</th>
                        <th>Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membersActivityData.map((m, i) => (
                        <tr key={i}>
                          <td>{m.member}</td>
                          <td>{m.email}</td>
                          <td>{m.team}</td>
                          <td>{m.project}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
            {activeTab === "onboarding" && (
              <div className="p-3 border rounded">
                {/* Summary */}
                <div className="d-flex justify-content-between text-center border rounded p-3 mb-4">
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
                {/* Onboarding Table */}
                <div className="table-responsive">
                  <Table
                    bordered
                    hover
                    className="text-center"
                    style={{ backgroundColor: "#d8b6ff" }}
                  >
                    <thead style={{ backgroundColor: "#a34efc", color: "#fff" }}>
                      <tr>
                        <th>Email</th>
                        <th>Accepted</th>
                        <th>Logged In</th>
                        <th>Tracked Time</th>
                        <th>Send Reminder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onboardingData.map((u, i) => (
                        <tr key={i}>
                          <td>
                            <span className="badge bg-light text-dark me-2">
                              {u.initials}
                            </span>
                            {u.email}
                          </td>
                          <td className="text-center">
                            {u.accepted ? (
                              <FaCheckCircle color="green" />
                            ) : (
                              <FaTimesCircle color="red" />
                            )}
                          </td>
                          <td className="text-center">
                            {u.loggedIn ? (
                              <FaCheckCircle color="green" />
                            ) : (
                              <FaTimesCircle color="red" />
                            )}
                          </td>
                          <td className="text-center">
                            {u.trackedTime ? (
                              <FaCheckCircle color="green" />
                            ) : (
                              <FaTimesCircle color="red" />
                            )}
                          </td>
                          <td className="text-center">
                            <FaPaperPlane
                              color="#a34efc"
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
            {activeTab === "archived" && (
              <div className="p-3 border rounded">📂 Archived Records</div>
            )}
          </div>
        </div>

        {/* React-Bootstrap Modal for Invite */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Invite Members</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Sub-tabs */}
            <div className="d-flex mb-3">
              {(["email", "bulk", "link"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`btn border-0 fw-bold ${
                    activeTab2 === tab
                      ? "text-primary position-relative"
                      : "text-muted"
                  }${tab === "email" ? "" : " ms-3"}`}
                  onClick={() => setActiveTab2(tab)}
                >
                  {tab === "email"
                    ? "By Email"
                    : tab === "bulk"
                    ? "Bulk Invite"
                    : "Copy Link"}
                  {activeTab2 === tab && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 border border-primary"></div>
                  )}
                </button>
              ))}
            </div>

            {activeTab2 === "email" && (
              <div className="row">
                <div className="col-md-4">
                  <label className="fw-bold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="example@gmail.com"
                  />
                </div>
                <div className="col-md-4">
                  <label className="fw-bold">Team</label>
                  <MultiSelect
                    value={selectedCities}
                    options={cities}
                    onChange={(e: any) => setSelectedCities(e.value)}
                    optionLabel="name"
                    placeholder="Select Team"
                    filter
                    display="chip"
                    className="w-100"
                  />
                </div>
                <div className="col-md-4">
                  <label className="fw-bold">Project</label>
                  <MultiSelect
                    value={selectedProject}
                    options={projects}
                    onChange={(e: any) => setSelectedProject(e.value)}
                    optionLabel="name"
                    placeholder="Select Project"
                    filter
                    display="chip"
                    className="w-100"
                  />
                </div>
                <div className="col-12 mt-2">
                  <a href="#" className="text-primary">
                    + Add Email
                  </a>
                </div>
              </div>
            )}

            {activeTab2 === "bulk" && (
              <div className="text-center p-3 border rounded">
                <p>
                  Upload <strong>CSV</strong>,{" "}
                  <strong>XLSX</strong>, or <strong>XLS</strong> files using our{" "}
                  <a href="#" className="text-primary">
                    template
                  </a>
                  .
                </p>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="mt-2 text-success">Selected File: {file.name}</p>
                )}
              </div>
            )}

            {activeTab2 === "link" && (
              <div className="text-center p-3 border rounded">
                <p>Copy the link to this workspace:</p>
                <InputGroup>
                  <FormControl readOnly value={inviteLink} />
                  <Button onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </InputGroup>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button style={{ backgroundColor: "#A463F2", color: "#fff" }}>
              Invite
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
