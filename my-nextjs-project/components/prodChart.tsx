"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { name: "Completed", value: 70 },
  { name: "Remaining", value: 30 },
]

const COLORS = {
  completed: "#F5C842", // Golden yellow to match the image
  remaining: "#E5E7EB", // Light gray for the background
}

export default function Home() {
  return (

      <div className="bg-white rounded-4  p-3 g-border h-100">
        <CardContent className="flex flex-col items-center justify-center h-full">
          <div className="relative w-48 h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                  strokeWidth={0}
                  strokeLinecap="round"
                >
                  <Cell key="completed" fill={COLORS.completed} />
                  <Cell key="remaining" fill={COLORS.remaining} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-black">70%</span>
            </div>
          </div>
          {/* Label */}
          <h3 className="text-xl font-semibold text-black">Productivity %</h3>
        </CardContent>
      </div>
    
  )
}
