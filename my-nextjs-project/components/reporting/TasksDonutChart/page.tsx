'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function TasksDonutChart() {
  // ✅ Dynamic task data
  const taskStats = {
    completed: 2,
    inProgress: 1,
    missed: 3,
  };

  // ✅ Convert to chart format
  const chartData = [
    { name: 'Completed', value: taskStats.completed },
    { name: 'In progress', value: taskStats.inProgress },
    { name: 'Missed', value: taskStats.missed },
  ];

  const COLORS = ['#00C853', '#FFC107', '#2F6CE5']; // Green, Yellow, Purple

  const totalTasks = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="charts-wrapper p-4 bg-white rounded-4 g-border TasksDonutChart" style={{  }}>
      <h6 className="fw-semibold mb-3">Tasks</h6>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="top"
            align="center"
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#000', fontSize: '13px',marginBottom:"15px" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="d-flex flex-column align-items-center mt-3">
        <div className="d-flex justify-content-between w-100 px-4 text-center">
          <div>
            <strong>{taskStats.completed.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Completed Tasks</div>
          </div>
          <div>
            <strong>{taskStats.inProgress.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">In-Progress</div>
          </div>
        </div>
        <div className="d-flex justify-content-between w-100 px-4 text-center mt-3">
          <div>
            <strong>{totalTasks.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Total Tasks assigned</div>
          </div>
          <div>
            <strong>{taskStats.missed.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Missed the deadline</div>
          </div>
        </div>
      </div>
    </div>
  );
}
