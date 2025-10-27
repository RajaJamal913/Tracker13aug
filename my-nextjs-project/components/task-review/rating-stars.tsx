
"use client"

import { useState, useEffect } from "react"

export default function RatingStars({
  value,
  onChange,
  size = 20,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const stars = [1, 2, 3, 4, 5]

  // ✅ Load Font Awesome CDN dynamically (only for this page)
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <span>
      {stars.map((s) => {
        const filled = (hover ?? value) >= s
        return (
          <button
            key={s}
            type="button"
            className="btn btn-link p-0 me-1"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(s)}
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
            title={`Rate ${s}`}
          >
            <i
              className={`fa-${filled ? "solid" : "regular"} fa-star`}
              style={{
                fontSize: `${size}px`,
                color: filled ? "#ffc107" : "#ccc",
                lineHeight: 1,
              }}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </span>
  )
}
