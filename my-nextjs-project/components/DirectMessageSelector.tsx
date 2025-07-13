"use client"

import { useState } from "react"
import { MultiSelect } from "primereact/multiselect"
import { Dialog } from "primereact/dialog"

interface User {
  id: string
  name: string
}

const allUsers: User[] = [
  { id: "u1", name: "John" },
  { id: "u2", name: "Sarah" },
  { id: "u3", name: "David" },
  { id: "u4", name: "Emily" }
]

export default function DirectMessageSelector({
  onSelectUsers
}: {
  onSelectUsers: (users: User[]) => void
}) {
  const [visible, setVisible] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const handleConfirm = () => {
    onSelectUsers(selectedUsers)
    setVisible(false)
  }

  return (
    <>
      <div
        className="chanells py-2 px-3 d-flex justify-content-between align-items-center border-b border-gray-100"
      >
        <span className="fw-bold text-white">Direct Message</span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setVisible(true)
          }}
          className="fs-3 text-decoration-none text-white"
        >
          +
        </a>
      </div>

      <Dialog
        header="Start New Chat"
        visible={visible}
        style={{ width: "25rem" }}
        onHide={() => setVisible(false)}
      >
        <MultiSelect
          value={selectedUsers}
          options={allUsers}
          onChange={(e) => setSelectedUsers(e.value)}
          optionLabel="name"
          placeholder="Search or select user(s)"
          filter
          display="chip"
          className="w-full"
        />
        <div className="mt-3 text-end">
          <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
            Start Chat
          </button>
        </div>
      </Dialog>
    </>
  )
}
