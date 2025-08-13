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
import { useState } from "react";
export default function TeamProductivityChart() {
     const [selectedTeam, setSelectedTeam] = useState<TeamName>("Frontend");
const teamColors = {
    Frontend: '#F4B740',     // Yellow
    Backend: '#00A86B',      // Green
    'UI/UX': '#E2C5FF',      // Light Purple
    Marketing: '#FF4B4B',    // Red
    QA: '#E9815A',           // Coral
    'Business Dev': '#5E2D92'// Dark Purple
  };

  const teamData = {
    'Frontend': [
      { name: 'Mon', value: 20 },
      { name: 'Tue', value: 40 },
      { name: 'Wed', value: 60 },
      { name: 'Thu', value: 50 },
      { name: 'Fri', value: 80 },
      { name: 'Sat', value: 30 },
      { name: 'Sun', value: 70 },
    ],
    'Backend': [
      { name: 'Mon', value: 50 },
      { name: 'Tue', value: 30 },
      { name: 'Wed', value: 80 },
      { name: 'Thu', value: 60 },
      { name: 'Fri', value: 40 },
      { name: 'Sat', value: 20 },
      { name: 'Sun', value: 90 },
    ],
    'UI/UX': [
      { name: 'Mon', value: 25 },
      { name: 'Tue', value: 55 },
      { name: 'Wed', value: 45 },
      { name: 'Thu', value: 65 },
      { name: 'Fri', value: 35 },
      { name: 'Sat', value: 75 },
      { name: 'Sun', value: 85 },
    ],
    'Marketing': [
      { name: 'Mon', value: 30 },
      { name: 'Tue', value: 60 },
      { name: 'Wed', value: 90 },
      { name: 'Thu', value: 20 },
      { name: 'Fri', value: 50 },
      { name: 'Sat', value: 70 },
      { name: 'Sun', value: 40 },
    ],
    'QA': [
      { name: 'Mon', value: 35 },
      { name: 'Tue', value: 65 },
      { name: 'Wed', value: 25 },
      { name: 'Thu', value: 75 },
      { name: 'Fri', value: 45 },
      { name: 'Sat', value: 85 },
      { name: 'Sun', value: 55 },
    ],
    'Business Dev': [
      { name: 'Mon', value: 40 },
      { name: 'Tue', value: 20 },
      { name: 'Wed', value: 60 }, 
      { name: 'Thu', value: 80 },
      { name: 'Fri', value: 30 },
      { name: 'Sat', value: 90 },
      { name: 'Sun', value: 50 },
    ],
  };

  type TeamName = keyof typeof teamData;



  const handleTeamChange = (team: TeamName) => {
    setSelectedTeam(team);
  };





  return (
    <div className="chart-container g-shadow h-100 p-4" style={{ background: '#fff', borderRadius: '20px' }}>
                <h5 className="fw-bold mb-4">Team Productivity</h5>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {(Object.keys(teamData) as (keyof typeof teamData)[]).map((team) => (
                    <button
                      key={team}
                      onClick={() => handleTeamChange(team)}
                      style={{
                        backgroundColor: teamColors[team],
                        border: selectedTeam === team ? '2px solid #000' : 'none',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {team}
                    </button>
                  ))}
    
                </div>
    
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamData[selectedTeam]} barSize={30}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      allowDecimals={false}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="value" radius={[50, 50, 50, 50]}>
                      {teamData[selectedTeam].map((_, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={teamColors[selectedTeam]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
    
  );
}
