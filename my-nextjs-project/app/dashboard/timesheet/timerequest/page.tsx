"use client";
import React, { useState } from "react";
import { Tab, Nav, Table, Card } from "react-bootstrap";
import FilterMultiSelects from '@/components/FilterMultiSelects';

const data = {
  pending: [
    {
      member: "Hamza",
      project: "Law website design",
      requestedTime: "00:30",
      timeRange: "10:00 - 11:15",
      status: "Pending",
    },
  ],
  approved: [
    {
      member: "Sara",
      project: "Mobile App UI",
      requestedTime: "02:00",
      timeRange: "1:00 - 3:00",
      status: "Approved",
    },
  ],
  rejected: [
    {
      member: "Ali",
      project: "Blog SEO",
      requestedTime: "01:15",
      timeRange: "10:00 - 11:15",
      status: "Rejected",
    },
  ],
};

type TabKey = keyof typeof data; // "pending" | "approved" | "rejected"

const TimeRequestTabs = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const renderTable = (tabKey: TabKey) => {
    return (
      <div className="g-table-wrap">
        <Table className="table-responsive g-table">
          <thead className="table-primary">
            <tr>
              <th>Member</th>
              <th>Project</th>
              <th>Requested Time</th>
              <th>Time Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data[tabKey].map((item, idx) => (
              <tr key={idx}>
                <td>{item.member}</td>
                <td>{item.project}</td>
                <td>{item.requestedTime}</td>
                <td>{item.timeRange}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid mt-5">
        <div className="d-flex align-items-center justify-content-between flex-wrap mb-4">
          <h2 className="page-heading-wrapper">Time Request</h2>
        </div>

        <div className="d-flex justify-content-start mb-4">
          <FilterMultiSelects />
        </div>

        <div className="">
          <div className="g-tabs-wrapper-parent">
            <Nav
              variant="tabs"
              className="g-tabs-wrapper"
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k as TabKey)}
            >
              <Nav.Item>
                <Nav.Link eventKey="pending">Pending</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="approved">Approved</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rejected">Rejected</Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
          <h5 className="mt-4">Time Request Data</h5>
          {renderTable(activeTab)}
        </div>
      </div>

      <style jsx>
        {`
          /* Your styles here */
        `}
      </style>
    </>
  );
};

export default TimeRequestTabs;
