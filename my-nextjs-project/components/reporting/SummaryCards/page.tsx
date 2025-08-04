"use client"

// import { summaryStats } from "../data/dashboard-data"

const summaryStats = {
  totalWorkingHours: "54 Hours",
  trackedHours: "46hr 82min",
  budget: "PKR 44,447",
}
export default function SummaryCards() {
  const cards = [
    {
      title: "Total Working hours",
      value: summaryStats.totalWorkingHours,
      bgColor: "#f8f9fa",
      textColor: "#9A4AFD",
    },
    {
      title: "Tracked Hours",
      value: summaryStats.trackedHours,
      bgColor: "#f8f9fa",
      textColor: "#9A4AFD",
    },
    {
      title: "Budget",
      value: summaryStats.budget,
      bgColor: "#f8f9fa",
      textColor: "#9A4AFD",
    },
  ]

  return (
    <div className="row mb-4">
      {cards.map((card, index) => (
        <div key={index} className="col-md-4 mb-3">
          <div className="card summary-cards h-100 border-0 rounded-4 g-shadow" >
            <div className="card-body">
              <h6 className="card-title mb-2">{card.title}</h6>
              <h4 className="mb-0" style={{ color: card.textColor, fontWeight: "bold" }}>
                {card.value}
              </h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
