"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Legend,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import React from 'react';
export default function ProjectOverviewChart() {





  const Invite_members = [
    { name: "Invitation Sent", value: 3, color: "#EB795F" },
    { name: "Accepted", value: 19, color: "#FFBB58" },
    { name: "Logged In", value: 15, color: "#00A982" },
    { name: "Tracked Time", value: 15, color: "#FE3A3C" },
  ];


  const projOverview = [
    {
      name: 'Tracker',
      value: 3,
      fill: '#EB795F', // Blue color for "Invitation Sent"
    },
    {
      name: 'CRM',
      value: 19,
      fill: '#FFBB58', // Green color for "Accepted"
    },
    {
      name: 'Real Estate',
      value: 15,
      fill: '#00A982', // Orange color for "Logged In"
    },
    {
      name: 'Riding App',
      value: 15,
      fill: '#FE3A3C', // Red color for "Tracked Time"
    },
  ];
  // Ensure percent is a **number**, not string
  const total = projOverview.reduce((sum, item) => sum + item.value, 0);
  const invitemember = projOverview.map(item => ({
    ...item,
    percent: (item.value / total) * 100, // numeric percentage
  }));

  // for chart 


  return (
     <div className="inv-wrap">
               <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "10px" }}>
                    {Invite_members.map((entry, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <div style={{ width: 20, height: 10, backgroundColor: entry.color, borderRadius: 2 }}></div>
                        <span style={{ fontSize: "14px", fontWeight: "bold" }}>{entry.value}</span>
                      </div>
                    ))}
                  </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart className="sp-chart"
                  data={invitemember}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="">
                    {invitemember.map((entry, index) => (
                      <React.Fragment key={`bar-${index}`}>
                        {/* <Bar dataKey="value" name={entry.name} fill={entry.fill} /> */}
                      </React.Fragment>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
  );
}
