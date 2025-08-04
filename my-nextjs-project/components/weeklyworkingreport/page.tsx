'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const data = [
  { day: 'Mon', hours: 2 },
  { day: 'Tue', hours: 8 },
  { day: 'Wed', hours: 6 },
  { day: 'Thu', hours: 3.7 },
  { day: 'Fri', hours: 2.8 },
  { day: 'Sat', hours: 4.5 },
  { day: 'Sun', hours: 5.9 },
];

export default function WeeklyWorkingHoursChart() {
  return (
   
       <div className="charts-wrapper p-4 bg-white rounded-4 g-shadow">
      <h5 className="mb-4 fw-semibold">Weekly Working hours</h5>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="hours" fill="#7b2cbf" radius={[10, 10, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  
   
  );
}
