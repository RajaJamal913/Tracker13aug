'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const data = [ 
  { month: 'Jan', completed: 20, created: 11 },
  { month: 'Feb', completed: 20, created: 11 },
  { month: 'Mar', completed: 20, created: 11 },
  { month: 'Apr', completed: 20, created: 11 },
]

export default function ProductivityChart() {
  return (
    <div className="p-4 bg-white g-charts h-100" style={{ borderRadius: '20px' }}>
      <h5 className="fw-bold mb-3">Productivity Trends Analysis</h5>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="20%" barGap={5}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend
            verticalAlign="top"
            align="center"
            wrapperStyle={{ marginBottom: '50px' }}
          />
          <Bar dataKey="completed" fill="#22C55E" name="Task Completed" radius={[5, 5, 0, 0]} />
          <Bar dataKey="created" fill="#3B82F6" name="Task Created" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
