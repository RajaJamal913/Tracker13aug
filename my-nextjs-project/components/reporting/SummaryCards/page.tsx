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
      textColor: "#2F6CE5",
      borderColor: "#2F6CE5",
    },
    {
      title: "Tracked Hours",
      value: summaryStats.trackedHours,
      bgColor: "#f8f9fa",
      textColor: "#31A300",
       borderColor: "#31A300",
    },
    {
      title: "Budget",
      value: summaryStats.budget,
      bgColor: "#f8f9fa",
      textColor: "#D08700",
      borderColor: "#D08700",
    },
  ]

  return (
    <div className="row mb-4">
      {cards.map((card, index) => (
        <div key={index} className="col-md-4 mb-3">
          {/* <div className="card summary-cards h-100 border-0 rounded-4 g-shadow" >
            <div className="card-body">
              <h6 className="card-title mb-2">{card.title}</h6>
              <h4 className="mb-0" style={{ color: card.textColor, fontWeight: "bold" }}>
                {card.value}
              </h4>
            </div>
          </div> */}


          <div className="card g-card " style={{ border: "2px solid card.borderColor" }}>
              <div className="icon mb-2 d-flex align-items-center justify-content-between">
                <small className="" style={{ color: card.textColor }}>{card.title}</small>
                


              </div>
              <div className="count">
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
