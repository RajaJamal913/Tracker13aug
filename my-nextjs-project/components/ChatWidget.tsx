"use client"

import { useState } from "react"
import { MessageCircle, X, Minus } from "lucide-react"

interface ChatWidgetProps {
  className?: string
}

export default function ChatWidget({ className = "" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`position-fixed bottom-0 end-0 m-4 btn btn-primary rounded-circle p-3 shadow ${className}`}
          style={{ zIndex: 1050 }}
        >
          <MessageCircle size={24} />
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            3
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`position-fixed bottom-0 end-0 m-4 bg-white rounded shadow border d-flex flex-column ${isMinimized ? "overflow-hidden" : ""}`}
          style={{ width: "20rem", height: isMinimized ? "3rem" : "24rem", zIndex: 1050 }}
        >
          {/* Header */}
          <div className="bg-primary text-white px-3 py-2 d-flex align-items-center justify-content-between rounded-top">
            <h3 className="h6 mb-0">Team Chat</h3>
            <div className="d-flex align-items-center gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)} className="btn btn-sm btn-primary">
                <Minus size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="btn btn-sm btn-primary">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chat Content (only show when not minimized) */}
          {!isMinimized && (
            <> 
              {/* Messages */}
              <div className="flex-grow-1 p-3 overflow-auto bg-light">
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-start gap-2">
                    <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: "1.5rem", height: "1.5rem", fontSize: "0.75rem" }}>
                      J
                    </div>
                    <div className="bg-white rounded p-2 shadow-sm" style={{ maxWidth: "15rem" }}>
                      <p className="mb-1 small">Hey! How's the project going?</p>
                      <span className="small text-muted">2:30 PM</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-2 justify-content-end">
                    <div className="bg-primary text-white rounded p-2 shadow-sm" style={{ maxWidth: "15rem" }}>
                      <p className="mb-1 small">Going great! Almost done with the dashboard.</p>
                      <span className="small text-light">2:32 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="p-3 border-top">
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="form-control form-control-sm"
                  />
                  <button className="btn btn-primary btn-sm">
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
