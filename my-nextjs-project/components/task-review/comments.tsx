"use client"

import { useMemo, useState } from "react"
import RatingStars from "./rating-stars"

type Comment = {
  id: string
  author: string
  at: string
  body: string
}

export default function Comments({
  onApprove,
  rating,
  setRating,
}: {
  onApprove: () => void
  rating: number
  setRating: (v: number) => void
}) {
  const initial = useMemo<Comment[]>(
    () => [
      {
        id: "2",
        author: "Jane Doe",
        at: "Yesterday • 12:00 PM",
        body: "Hello sir I have completed the task and attached screenshots in attachments section.",
      },
    ],
    [],
  )
  const [comments, setComments] = useState<Comment[]>(initial)
  const [text, setText] = useState("")

  const addComment = () => {
    const txt = text.trim()
    if (!txt) return
    setComments((prev) => [
      {
        id: crypto.randomUUID(),
        author: "John Doe",
        at: new Date().toLocaleString(),
        body: txt,
      },
      ...prev,
    ])
    setText("")
  }

  const loadMore = () => {
    // Fake pagination: duplicates last item with a new id
    const last = comments[comments.length - 1]
    if (!last) return
    setComments((prev) => [...prev, { ...last, id: crypto.randomUUID(), at: "Last week • 3:45 PM" }])
  }

  return (
    <section aria-labelledby="comments-heading">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h6 id="comments-heading" className="mb-3">
          Comments
        </h6>
        <button className="g-btn" onClick={onApprove}>
          Approve Task
        </button>
      </div>

      {/* Composer */}
      <div className="card border-primary-subtle mb-3">
        <div className="card-body">
          <div className="d-flex align-items-start gap-3">
            <div
              className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40 }}
              aria-hidden="true"
            >
              <i className="bi bi-person fs-5 text-secondary" />
            </div>

            <div className="flex-grow-1 w-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>John Doe</strong>
                <div className="d-flex align-items-center gap-2">
                  <a href="#" onClick={(e) => e.preventDefault()} className="small text-decoration-none">
                    Give Rating
                  </a>
                  <RatingStars value={rating} onChange={setRating} size={18} />
                </div>
              </div>
              <textarea
                className="form-control mb-2"
                placeholder="Write your message here…"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="d-flex justify-content-between">
                <div className="btn-group" role="group" aria-label="Formatting">
                  <button type="button" className="btn btn-outline-secondary btn-sm">
                   <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 3.83398H11.6667C12.5507 3.83398 13.3986 4.18517 14.0237 4.81029C14.6488 5.43542 15 6.28326 15 7.16732C15 8.05137 14.6488 8.89922 14.0237 9.52434C13.3986 10.1495 12.5507 10.5007 11.6667 10.5007H5V3.83398Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5 10.5H12.5C13.3841 10.5 14.2319 10.8512 14.857 11.4763C15.4821 12.1014 15.8333 12.9493 15.8333 13.8333C15.8333 14.7174 15.4821 15.5652 14.857 16.1904C14.2319 16.8155 13.3841 17.1667 12.5 17.1667H5V10.5Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm">
                   <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.8335 3.83398H8.3335" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.6665 17.166H4.1665" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.5 3.83398L7.5 17.1673" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-sm">
                   <svg width="11" height="18" viewBox="0 0 11 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.9997 12.1243C10.9997 13.5688 10.4927 14.798 9.47884 15.8118C8.46495 16.8257 7.23579 17.3327 5.79134 17.3327C4.3469 17.3327 3.11773 16.8257 2.10384 15.8118C1.08995 14.798 0.583008 13.5688 0.583008 12.1243V4.41602C0.583008 3.37435 0.947591 2.48893 1.67676 1.75977C2.40592 1.0306 3.29134 0.666016 4.33301 0.666016C5.37467 0.666016 6.26009 1.0306 6.98926 1.75977C7.71842 2.48893 8.08301 3.37435 8.08301 4.41602V11.7077C8.08301 12.3466 7.86079 12.8882 7.41634 13.3327C6.9719 13.7771 6.43023 13.9993 5.79134 13.9993C5.15245 13.9993 4.61079 13.7771 4.16634 13.3327C3.7219 12.8882 3.49967 12.3466 3.49967 11.7077V3.99935H5.16634V11.7077C5.16634 11.8882 5.22537 12.0375 5.34342 12.1556C5.46148 12.2737 5.61079 12.3327 5.79134 12.3327C5.9719 12.3327 6.1212 12.2737 6.23926 12.1556C6.35731 12.0375 6.41634 11.8882 6.41634 11.7077V4.41602C6.40245 3.83268 6.19759 3.33963 5.80176 2.93685C5.40592 2.53407 4.91634 2.33268 4.33301 2.33268C3.74967 2.33268 3.25662 2.53407 2.85384 2.93685C2.45106 3.33963 2.24967 3.83268 2.24967 4.41602V12.1243C2.23579 13.1105 2.57606 13.9473 3.27051 14.6348C3.96495 15.3223 4.80523 15.666 5.79134 15.666C6.76356 15.666 7.58995 15.3223 8.27051 14.6348C8.95106 13.9473 9.30523 13.1105 9.33301 12.1243V3.99935H10.9997V12.1243Z" fill="#1C1B1F"/>
</svg>

                  </button>
                </div>
                <button className="g-btn" onClick={addComment}>
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing comments */}
      <ul className="list-unstyled">
        {comments.map((c) => (
          <li key={c.id} className="d-flex gap-3 mb-3">
            <div
              className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 40, height: 40 }}
              aria-hidden="true"
            >
              <i className="bi bi-person fs-5 text-secondary" />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center justify-content-between">
                <strong>{c.author}</strong>
                <span className="small text-muted">{c.at}</span>
              </div>
              <p className="mb-0">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <button className="g-btn w-100" onClick={loadMore}>
        Load More
      </button>
    </section>
  )
}
