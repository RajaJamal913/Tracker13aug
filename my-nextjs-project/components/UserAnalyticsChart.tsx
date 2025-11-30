"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Sample data for a full month (31 days)
const analyticsData = [
  { day: 1, productivity: 42, bottlenecks: 15 },
  { day: 2, productivity: 50, bottlenecks: 18 },
  { day: 3, productivity: 52, bottlenecks: 20 },
  { day: 4, productivity: 43, bottlenecks: 14 },
  { day: 5, productivity: 56, bottlenecks: 8 },
  { day: 6, productivity: 46, bottlenecks: 25 },
  { day: 7, productivity: 52, bottlenecks: 22 },
  { day: 8, productivity: 28, bottlenecks: 33 },
  { day: 9, productivity: 39, bottlenecks: 28 },
  { day: 10, productivity: 56, bottlenecks: 35 },
  { day: 11, productivity: 56, bottlenecks: 36 },
  { day: 12, productivity: 42, bottlenecks: 34 },
  { day: 13, productivity: 35, bottlenecks: 33 },
  { day: 14, productivity: 42, bottlenecks: 14 },
  { day: 15, productivity: 54, bottlenecks: 32 },
  { day: 16, productivity: 56, bottlenecks: 35 },
  { day: 17, productivity: 56, bottlenecks: 35 },
  { day: 18, productivity: 56, bottlenecks: 35 },
  { day: 19, productivity: 56, bottlenecks: 35 },
  { day: 20, productivity: 56, bottlenecks: 35 },
  { day: 21, productivity: 56, bottlenecks: 35 },
  { day: 22, productivity: 56, bottlenecks: 35 },
  { day: 23, productivity: 56, bottlenecks: 35 },
  { day: 24, productivity: 56, bottlenecks: 35 },
  { day: 25, productivity: 56, bottlenecks: 35 },
  { day: 26, productivity: 56, bottlenecks: 35 },
  { day: 27, productivity: 56, bottlenecks: 35 },
  { day: 28, productivity: 56, bottlenecks: 35 },
  { day: 29, productivity: 44, bottlenecks: 35 },
  { day: 30, productivity: 42, bottlenecks: 35 },
  { day: 31, productivity: 36, bottlenecks: 24 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{`Productivity: ${payload[0].value}`}</p>
        <p className="font-semibold text-gray-800">{`Bottleneck: ${payload[1].value}`}</p>
        <p className="text-gray-600">{`Date: July ${label}`}</p>
      </div>
    )
  }
  return null
}

export default function UserAnalyticsChart() {
  return (
    <div className="bg-white rounded-xl g-border p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-gray-500 text-sm mb-1">Statistics</p>
          <h2 className="text-xl font-bold text-gray-900">User Analytics Chart</h2>
        </div>
        <div className="flex flex-col space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-gray-700">User Productivity Score</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span className="text-gray-700">Bottlenecks Score (Issues/Delays)</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
            <YAxis
              label={{ value: "Productivity Score", angle: -90, position: "insideLeft" }}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#666" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="productivity" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="bottlenecks" fill="#fbbf24" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span>Higher is better</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
          <span>Lower is better</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>End of month = High issues, low productivity</span>
        </div>
      </div>
    </div>
  )
}
