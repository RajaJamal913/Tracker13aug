'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

const data = [
  { name: 'Completed', value: 145 },
  { name: 'In-progress', value: 89 },
  { name: 'Pending', value: 34 },
  { name: 'Overdue', value: 12 }
];

const COLORS = ['#FD4A4A', '#3087FF', '#F4B400', '#F72585'];

export default function TaskCompletionChart() {
  const totalTasks = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="p-4 bg-white g-charts h-100" style={{ width: '100%'}}>
      <h5 className="text-start fw-bold mb-3">Task Completion Status</h5>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="d-flex justify-content-between mt-3">
        <h6 className="fw-bold mb-0">Total Tasks</h6>
        <p className="fs-5">{totalTasks}</p>
      </div>

      <div className="d-flex flex-wrap justify-content-between text-sm">
        {data.map((item, index) => (
          <div className="col-md-6 d-flex align-items-center gap-2 mb-2" key={index}>
            <div
              style={{
                width: 14,
                height: 14,
                backgroundColor: COLORS[index],
                borderRadius: '4px'
              }}
            ></div>
            <span className='fw-bold'>{item.name} : {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
