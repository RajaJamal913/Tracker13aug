"use client"

// import { tasksList } from "../data/dashboard-data"
const tasksList = [
  { name: "Figma wireframes", duration: "6hr 43min" },
  { name: "Fitness app design", duration: "7hr 29min" },
  { name: "Web development", duration: "2hr 43min" },
  { name: "App designing", duration: "4hr 19min" },
  { name: "Figma wireframes", duration: "1hr 43min" },
  { name: "Website Design", duration: "5hr 43min" },
]
export default function TasksList() {
  return (
    <div className="charts-wrapper p-4 bg-white rounded-4 g-border">
      <div className="card-body">
        <h6 className="card-title mb-3">Tasks</h6>

        <div className="tasks-list">
          {tasksList.map((task, index) => (
            <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <span className="small">{task.name}</span>
              <span className="small text-muted">{task.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
