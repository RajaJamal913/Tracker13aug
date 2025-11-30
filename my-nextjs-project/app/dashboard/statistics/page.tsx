// statistics page 

'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Dropdown } from 'react-bootstrap';
import FilterMultiSelects from '@/components/FilterMultiSelects';
import build from 'next/dist/build';
// build add 
interface DataItem {
  name: string;
  value: number;
  color: string;
}

type ModeType = 'Hours' | 'Amount';
type TimeFrameType = 'Day' | 'Week' | 'Month';
type TabType = 'overview' | 'performance' | 'activity';

interface DataSet {
  Hours: Record<TimeFrameType, DataItem[]>;
  Amount: Record<TimeFrameType, DataItem[]>;
}
// build add 

// build change 
// const dataSet = {
//   Hours: {
//     Day: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 563, color: '#6f2dbd' }, // 9hr 23min
//       { name: 'Hina Fatima - Figma Project', value: 83, color: '#f7aef8' }, // 1hr 23min
//     ],
//     Week: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 2400, color: '#6f2dbd' },
//       { name: 'Hina Fatima - Figma Project', value: 500, color: '#f7aef8' },
//     ],
//     Month: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 9600, color: '#6f2dbd' },
//       { name: 'Hina Fatima - Figma Project', value: 3200, color: '#f7aef8' },
//     ],
//   },
//   Amount: {
//     Day: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 100, color: '#6f2dbd' },
//       { name: 'Hina Fatima - Figma Project', value: 20, color: '#f7aef8' },
//     ],
//     Week: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 700, color: '#6f2dbd' },
//       { name: 'Hina Fatima - Figma Project', value: 300, color: '#f7aef8' },
//     ],
//     Month: [
//       { name: 'Muhammad Jamal Raja - App Development', value: 3000, color: '#6f2dbd' },
//       { name: 'Hina Fatima - Figma Project', value: 1200, color: '#f7aef8' },
//     ],
//   },
// };

const dataSet: DataSet = {
  Hours: {
    Day: [
      { name: 'Muhammad Jamal Raja - App Development', value: 563, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 83, color: '#f7aef8' },
    ],
    Week: [
      { name: 'Muhammad Jamal Raja - App Development', value: 2400, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 500, color: '#f7aef8' },
    ],
    Month: [
      { name: 'Muhammad Jamal Raja - App Development', value: 9600, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 3200, color: '#f7aef8' },
    ],
  },
  Amount: {
    Day: [
      { name: 'Muhammad Jamal Raja - App Development', value: 100, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 20, color: '#f7aef8' },
    ],
    Week: [
      { name: 'Muhammad Jamal Raja - App Development', value: 700, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 300, color: '#f7aef8' },
    ],
    Month: [
      { name: 'Muhammad Jamal Raja - App Development', value: 3000, color: '#6f2dbd' },
      { name: 'Hina Fatima - Figma Project', value: 1200, color: '#f7aef8' },
    ],
  },
};

// export default function DashboardTabs() {
//   const [mode, setMode] = useState('Hours');
//   const [timeFrame, setTimeFrame] = useState('Day');
//   const [activeTab, setActiveTab] = useState('overview');

//   const handleSwitch = (type) => setMode(type);
//   const handleDropdown = (val) => setTimeFrame(val);
//   const chartData = dataSet[mode][timeFrame];

//   const formatTime = (mins) => {
//     const h = Math.floor(mins / 60);
//     const m = mins % 60;
//     return `${h}hr ${m}min`;
//   };

// build change 
export default function DashboardTabs() {
  const [mode, setMode] = useState<ModeType>('Hours');
  const [timeFrame, setTimeFrame] = useState<TimeFrameType>('Day');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const handleSwitch = (type: ModeType) => setMode(type);
const handleDropdown = (val: string | null) => {
  if (val && ['Day', 'Week', 'Month'].includes(val)) {
    setTimeFrame(val as TimeFrameType);
  }
};
  const chartData = dataSet[mode][timeFrame];

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}hr ${m}min`;
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
            <>
          <div className="row">
            <div className="col-sm-6 px-0 mb-4">
                <div className="cardWrapper p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 ">
                <div>
                  <button
                    className={`btn btn-sm me-2 ${mode === 'Hours' ? 'g-btn' : 'btn-outline-secondary'}`}
                    onClick={() => handleSwitch('Hours')}
                  >
                    Hours
                  </button>
                  <button
                    className={`btn btn-sm ${mode === 'Amount' ? 'g-btn' : 'btn-outline-secondary'}`}
                    onClick={() => handleSwitch('Amount')}
                  >
                    Amount
                  </button>
                </div>
                <Dropdown onSelect={handleDropdown}>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    By {timeFrame}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item eventKey="Day">By Day</Dropdown.Item>
                    <Dropdown.Item eventKey="Week">By Week</Dropdown.Item>
                    <Dropdown.Item eventKey="Month">By Month</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              <div className="pie-chart-wrap mb-4">
                <PieChart width={300} height={300}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                    label={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>

             

              <div className="data-wrap">
                <ul className="list-unstyled">
                  {chartData.map((entry, index) => (
                    <li key={index} className="mb-2 d-flex align-items-center">
                      <div
                        style={{
                          backgroundColor: entry.color,
                          width: '16px',
                          height: '16px',
                          marginRight: '10px',
                        }}
                      ></div>
                      <div className="d-flex flex-column ">
                        <span className="me-auto">{entry.name}</span>
                        <strong>
                          {mode === 'Hours' ? formatTime(entry.value) : `$${entry.value}`}
                        </strong>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

                </div>
                
            </div>
          
            <div className="col-sm-6 px-0">
                <div className="cardWrapper p-4 h-100">
                     <div className="bar-chart-wrap mb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name={mode} fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
                </div>
            </div>
          </div>
          </>
        );

      case 'performance':
        return (
          <div className="p-4">
            <h5 className="cardTitle">Team Performance</h5>
            <div className="mb-3">
              <label className="form-label">Select Team Member:</label>
              <select className="form-select">
                <option>Member 1</option>
                <option>Member 2</option>
              </select>
            </div>
            <div className="chart-placeholder">[Performance Chart]</div>
          </div>
        );

      case 'activity':
        return (
          <div className="p-4">
            <h5 className="cardTitle">Recent Activity</h5>
            <div className="table-placeholder">[Activity Log Table]</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container py-5">
      <div className="row">
        <div className="tabContainer profile-settings-tabs-wrapper">
          <div className="um-btns-wrap d-flex">

            {/* build change  */}
            {/* {['overview', 'performance', 'activity'].map((tab) => (
              <button
                key={tab}
                className={`tabButton ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))} */}
{['overview', 'performance', 'activity'].map((tab) => (
  <button
    key={tab}
    className={`tabButton ${activeTab === tab ? 'active' : ''}`}
    onClick={() => setActiveTab(tab as TabType)}
  >
    {tab.charAt(0).toUpperCase() + tab.slice(1)}
  </button>
))}


          </div>
          <div className="avatar">DS</div>
        </div>

        <div className="col-lg-12 px-0 d">
          <FilterMultiSelects />
        </div>

        <div className="col-sm-12">{renderTabContent()}</div>
      </div>

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

        .cardTitle {
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2f6ce5;
        }

        .chart-placeholder,
        .table-placeholder {
          height: 200px;
          background-color: #f4f4f4;
          border: 2px dashed #ccc;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #888;
        }
      `}</style>
    </div>
  );
}
