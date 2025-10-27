"use client"

import type React from "react"

import { useState } from "react"

type FileRow = { id: string; name: string; size: string }

export default function Attachments() {
  const [files, setFiles] = useState<FileRow[]>([
    { id: "1", name: "homepage-final.png", size: "1.2 MB" },
    { id: "2", name: "design-specs.pdf", size: "680 KB" },
  ])

  const onAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFiles((prev) => [...prev, { id: crypto.randomUUID(), name: f.name, size: `${Math.ceil(f.size / 1024)} KB` }])
    e.currentTarget.value = ""
  }

  const remove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  return (
    <section aria-labelledby="attachments-heading">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 id="attachments-heading" className="mb-0">
          Attachments
        </h6>
        <label className="g-btn">
          <i className="bi bi-upload me-2" aria-hidden="true" />
          Upload
          <input type="file" className="d-none" onChange={onAdd} />
        </label>
      </div>

      <ul className="list-group">
        {files.map((f) => (
          <li key={f.id} className="list-group-item d-flex align-items-center justify-content-between mb-4 border-0 px-3 py-3">
            <div className="d-flex align-items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="22" viewBox="0 0 18 22" fill="none">
  <path d="M3.66625 21.7681H14.3334C16.4128 21.7681 17.4474 20.7134 17.4474 18.6241V9.50371H10.175C8.88925 9.50371 8.28668 8.89085 8.28668 7.60514V0.232422H3.66625C1.5971 0.232422 0.552246 1.29699 0.552246 3.38671V18.6241C0.552246 20.7233 1.5971 21.7681 3.66625 21.7681ZM10.2054 8.12757H17.3368C17.2665 7.71571 16.9751 7.31371 16.5032 6.82171L10.9584 1.18685C10.4964 0.704708 10.0747 0.413279 9.65253 0.342565V7.58542C9.65253 7.94671 9.84367 8.12757 10.2054 8.12757Z" fill="#7B3DD9"/>
</svg>
              <span>{f.name}</span>
              {/* <span className="badge text-bg-secondary">{f.size}</span> */}
            </div>
            {/* <button className="btn btn-sm btn-outline-danger" onClick={() => remove(f.id)}>
              <i className="bi bi-trash" aria-hidden="true" /> Remove
            </button> */}
            <button style={{color:"#7B3DD9"}} className="">
               Preview
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
