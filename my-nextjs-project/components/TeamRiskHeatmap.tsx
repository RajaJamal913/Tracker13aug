"use client"

import type React from "react"

// Sample data representing risk levels (0-3, where 0 is low risk, 3 is high risk)
const heatmapData = [
  { team: "Team 1", values: [0, 1, 2, 3] },
  { team: "Team 2", values: [0, 1, 2, 3] },
  { team: "Team 3", values: [0, 1, 2, 3] },
]

// Color mapping for risk levels
const getColor = (value: number) => {
  const colors = [
    "#7BB3FF", // Light blue (low risk)
    "#4A90E2", // Medium blue
    "#E57373", // Light red
    "#D32F2F", // Dark red (high risk)
  ]
  return colors[value] || colors[0]
}

const TeamRiskHeatmap: React.FC = () => {
  return (
    <div className="bg-white rounded-4 g-border p-6 h-100">
      <div className="space-y-4">
        {/* Heatmap Grid */}
        <div className="space-y-3 mb-6">
          {heatmapData.map((teamData, teamIndex) => (
            <div key={teamIndex} className="flex items-center gap-4">
              {/* Team Label */}
              <div className="w-20 flex-shrink-0">
                <h6 className="font-bold text-gray-900 text-sm">{teamData.team}</h6>
              </div>
              {/* Risk Blocks */}
              <div className="flex gap-2 flex-1">
                {teamData.values.map((value, valueIndex) => (
                  <div
                    key={valueIndex}
                    className="flex-1 h-10 rounded transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer"
                    style={{
                      backgroundColor: getColor(value),
                    }}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-3 w-80">
            <span className="font-medium text-gray-700 text-sm">low</span>
            <div className="flex-1">
              <div
                className="h-5 rounded-full"
                style={{
                  background: "linear-gradient(to right, #7BB3FF, #4A90E2, #E57373, #D32F2F)",
                }}
              ></div>
            </div>
            <span className="font-medium text-gray-700 text-sm">High</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h4 className="text-xl font-bold text-gray-900">Team Risk Heatmap</h4>
        </div>
      </div>
    </div>
  )
}

export default TeamRiskHeatmap
