"use client"

// import { attendanceData } from "../data/dashboard-data"
const attendanceData = [
  { date: "Mon 14, 2025", status: "Present" },
  { date: "Tue 15, 2025", status: "Present" },
  { date: "Wed 16, 2025", status: "Present" },
  { date: "Thu 17, 2025", status: "Absent" },
  { date: "Fri 18, 2025", status: "Late" },
  { date: "Sat 19, 2025", status: "Present" },
  { date: "Sun 20, 2025", status: "Off" },
]
export default function Attendance() {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Present: { bg: "#28a745", text: "white" },
      Absent: { bg: "#dc3545", text: "white" },
      Late: { bg: "#ffc107", text: "dark" },
      Off: { bg: "#6c757d", text: "white" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Off

    return (
      <span className="badge rounded-pill px-3" style={{ backgroundColor: config.bg, color: config.text }}>
        {status}
      </span>
    )
  }

  return (
    <div className="charts-wrapper p-4 bg-white rounded-4 g-shadow">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="card-title mb-0">Attendance</h6>
          <span className="text-muted small">May</span>
        </div>

        <div className="attendance-list">
          {attendanceData.map((item, index) => (
            <div key={index} className="d-flex justify-content-between align-items-center py-2">
              <span className="small text-muted">{item.date}</span>
              {getStatusBadge(item.status)}
            </div>
          ))}
        </div>

        <div className="d-flex justify-content-center mt-3 gap-2">
          <span className="badge rounded-pill" style={{ backgroundColor: "#28a745" }}>
            04
          </span>
          <span className="badge rounded-pill" style={{ backgroundColor: "#dc3545" }}>
            01
          </span>
          <span className="badge rounded-pill" style={{ backgroundColor: "#ffc107" }}>
            01
          </span>
        </div>
      </div>
    </div>
  )
}
