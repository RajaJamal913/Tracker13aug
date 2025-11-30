"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot } from "recharts"

const data = [
  { date: "1 Oct", bottlenecks: 3, forecasted: false },
  { date: "3 Oct", bottlenecks: 5, forecasted: false },
  { date: "7 Oct", bottlenecks: 4, forecasted: false, highlight: true },
  { date: "10 Oct", bottlenecks: 6, forecasted: false },
  { date: "14 Oct", bottlenecks: 8, forecasted: false },
  { date: "20 Oct", bottlenecks: 3, forecasted: false, highlight: true },
  { date: "23 Oct", bottlenecks: 1, forecasted: true },
  { date: "27 Oct", bottlenecks: 4, forecasted: true },
  { date: "30 Oct", bottlenecks: 7, forecasted: true },
]

export default function BottleneckTimeline() {
  return (
    <div className="bg-white rounded-lg g-border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Bottleneck Timeline</h2>
        <p className="text-sm text-gray-500">Forecasted Bottlenecks (Next 7 Days)</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#666" }}
              label={{
                value: "# of Bottlenecks",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: "12px", fill: "#666" },
              }}
            />

            {/* Solid line for historical data */}
            <Line
              type="monotone"
              dataKey="bottlenecks"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
              connectNulls={false}
              data={data.filter((d) => !d.forecasted)}
            />

            {/* Dashed line for forecasted data */}
            <Line
              type="monotone"
              dataKey="bottlenecks"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "white", stroke: "#8b5cf6", strokeWidth: 2, r: 4 }}
              connectNulls={false}
              data={data.filter((d) => d.forecasted)}
            />

            {/* Highlight dots */}
            {data
              .filter((d) => d.highlight)
              .map((point, index) => (
                <ReferenceDot key={index} x={point.date} y={point.bottlenecks} r={4} fill="#ef4444" stroke="#ef4444" />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
