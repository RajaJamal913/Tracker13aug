'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ProjectsDonutChart() {
  // ✅ Dynamic project data
  const projectStats = {
    completed: 4,
    inProgress: 2,
    missed: 1,
  };

  const chartData = [
    { name: 'Completed', value: projectStats.completed },
    { name: 'In progress', value: projectStats.inProgress },
    { name: 'Missed', value: projectStats.missed },
  ];

  const COLORS = ['#00C853', '#FFC107', '#6A0DAD']; // Green, Yellow, Purple
  const totalProjects = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="charts-wrapper p-4 bg-white rounded-4 g-shadow TasksDonutChart" >
      <h6 className="fw-semibold mb-3">Projects</h6>

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
            align="right"
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#000', fontSize: '13px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="d-flex flex-column align-items-center mt-3">
        <div className="d-flex justify-content-between w-100 px-4 text-center">
          <div>
            <strong>{projectStats.completed.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Completed Projects</div>
          </div>
          <div>
            <strong>{projectStats.inProgress.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">In-Progress</div>
          </div>
        </div>
        <div className="d-flex justify-content-between w-100 px-4 text-center mt-3">
          <div>
            <strong>{totalProjects.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Total Projects</div>
          </div>
          <div>
            <strong>{projectStats.missed.toString().padStart(2, '0')}</strong>
            <div className="text-muted small">Missed the deadline</div>
          </div>
        </div>
      </div>
    </div>
  );
}
