// break page 

'use client'

import { useState, useEffect, useRef } from 'react'

import {
  Spinner,
  Alert,
  Button as RBButton,
  Card,
  Row,
  Col,
} from 'react-bootstrap'
import { FaPlay, FaPause, FaCoffee, FaStop, FaTrash, FaEdit } from 'react-icons/fa'
import { InputText } from 'primereact/inputtext'
import { MultiSelect } from 'primereact/multiselect'
import { Dropdown as PrimeDropdown } from 'primereact/dropdown'
import { Checkbox } from 'primereact/checkbox'

type WorkStatusResponse = {
  member: number
  status: 'active' | 'paused'
  total_seconds: number
}

type BreakStatusResponse = {
  member: number
  policy_name: string
  status: 'active' | 'paused'
  total_seconds: number
}

type BreakPolicy = {
  id: number
  name: string
  members: number[]       // array of Member IDs
  apply_to_new: boolean
  max_minutes_per_day: number
  type: 'Paid' | 'Unpaid'
}

type MemberOption = {
  name: string
  code: number
}

// ─────────────────────────────────────────────────────────────────────────────
// If you want to populate real members from the backend, you can fetch them.
// For now, we’ll use a sample array. Adjust as needed.
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_MEMBERS: MemberOption[] = [
  { name: 'Alice', code: 1 },
  { name: 'Bob', code: 2 },
  { name: 'Charlie', code: 3 },
]
const TYPE_OPTIONS = [
  { label: 'Paid', value: 'Paid' },
  { label: 'Unpaid', value: 'Unpaid' },
]

export default function Home() {
  // ─── Shared State ───────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(null)

  // Work session state:
  const [workData, setWorkData] = useState<WorkStatusResponse | null>(null)
  const [loadingWork, setLoadingWork] = useState(true)
  const [workError, setWorkError] = useState<string | null>(null)

  // Break session state:
  const [breakData, setBreakData] = useState<BreakStatusResponse | null>(null)
  const [loadingBreak, setLoadingBreak] = useState(true)
  const [breakError, setBreakError] = useState<string | null>(null)

  // Policies list + related loading/error state
  const [policies, setPolicies] = useState<BreakPolicy[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(true)
  const [policiesError, setPoliciesError] = useState<string | null>(null)

  // Control the “Create Break Policy” modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [breakName, setBreakName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [applyToNew, setApplyToNew] = useState(false)
  const [maxMinPerDay, setMaxMinPerDay] = useState('')
  const [type, setType] = useState<'Paid' | 'Unpaid' | null>(null)
  const [creatingPolicy, setCreatingPolicy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Control the “select a policy” (start break) modal
  const [showPolicyDropdown, setShowPolicyDropdown] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<BreakPolicy | null>(null)

  // Deletion loading
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // A single interval for ticking whichever session is active
  // build change 
  // const intervalRef = useRef<NodeJS.Timer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ─── 1) On mount, read token from localStorage ───────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('token')
    if (!saved) {
      setWorkError('No token found. Please log in.')
      setBreakError('No token found. Please log in.')
      setLoadingWork(false)
      setLoadingBreak(false)
      return
    }
    setToken(saved)
  }, [])

  // ─── 2) Once we have a token, fetch work & break status and policy list ───────
  useEffect(() => {
    if (!token) return

    // Fetch WorkSession status
    const fetchWorkStatus = async () => {
      setLoadingWork(true)
      setWorkError(null)

      try {
        const res = await fetch('http://127.0.0.1:8000/api/monitor/status/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        })

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setWorkError('Auth failed. Please log in again.')
          } else {
            const text = await res.text()
            setWorkError(`Failed to fetch work status: ${text}`)
          }
          setWorkData(null)
          setLoadingWork(false)
          return
        }

        const data: WorkStatusResponse = await res.json()
        setWorkData(data)
      } catch {
        setWorkError('Network error while fetching work status.')
        setWorkData(null)
      } finally {
        setLoadingWork(false)
      }
    }

    // Fetch BreakSession status
    const fetchBreakStatus = async () => {
      setLoadingBreak(true)
      setBreakError(null)

      try {
        const res = await fetch('http://127.0.0.1:8000/api/monitor/break/status/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        })

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setBreakError('Auth failed. Please log in again.')
          } else {
            const text = await res.text()
            setBreakError(`Failed to fetch break status: ${text}`)
          }
          setBreakData(null)
          setLoadingBreak(false)
          return
        }

        const data: BreakStatusResponse = await res.json()
        setBreakData(data)
      } catch {
        setBreakError('Network error while fetching break status.')
        setBreakData(null)
      } finally {
        setLoadingBreak(false)
      }
    }

    // Fetch BreakPolicy list
    const fetchPolicies = async () => {
      setLoadingPolicies(true)
      setPoliciesError(null)

      try {
        const res = await fetch('http://127.0.0.1:8000/api/monitor/break/policies/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        })

        if (!res.ok) {
          const text = await res.text()
          setPoliciesError(`Failed to fetch policies: ${text}`)
          setPolicies([])
        } else {
          const data: BreakPolicy[] = await res.json()
          setPolicies(data)
        }
      } catch {
        setPoliciesError('Network error while fetching policies.')
        setPolicies([])
      } finally {
        setLoadingPolicies(false)
      }
    }

    fetchWorkStatus()
    fetchBreakStatus()
    fetchPolicies()
  }, [token])

  // ─── 3) Whenever workData or breakData changes, start/stop the right timer ────
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // If break is active → tick break timer
    if (breakData?.status === 'active') {
      intervalRef.current = setInterval(() => {
        setBreakData(prev => {
          if (!prev || prev.status !== 'active') return prev!
          return {
            ...prev,
            total_seconds: prev.total_seconds + 1,
          }
        })
      }, 1000)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // Else if work is active → tick work timer
    if (workData?.status === 'active') {
      intervalRef.current = setInterval(() => {
        setWorkData(prev => {
          if (!prev || prev.status !== 'active') return prev!
          return {
            ...prev,
            total_seconds: prev.total_seconds + 1,
          }
        })
      }, 1000)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // If neither is active, do nothing
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [workData, breakData])

  // ─── 4) Format HH:MM:SS ─────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0')
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // ─── 5) Work Handlers ───────────────────────────────────────────────────────────
  const handleStartWork = async () => {
    if (!token) {
      setWorkError('Cannot start work: no token found.')
      return
    }
    setActionLoading(true)
    setWorkError(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/monitor/start/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setWorkError(`Failed to start work session: ${text}`)
      } else {
        const data: WorkStatusResponse = await res.json()
        setWorkData(data)
      }
    } catch {
      setWorkError('Network error while starting work session.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStopWork = async () => {
    if (!token) {
      setWorkError('Cannot stop work: no token found.')
      return
    }
    setActionLoading(true)
    setWorkError(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/monitor/stop/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setWorkError(`Failed to stop work session: ${text}`)
      } else {
        const data: WorkStatusResponse = await res.json()
        setWorkData(data)
      }
    } catch {
      setWorkError('Network error while stopping work session.')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── 6) Break Handlers ──────────────────────────────────────────────────────────
  const handleStartBreak = async () => {
    if (!token || !selectedPolicy) {
      setBreakError('Please select a break policy before starting a break.')
      return
    }
    setActionLoading(true)
    setBreakError(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/monitor/break/start/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ policy_id: selectedPolicy.id }),
      })

      if (!res.ok) {
        const text = await res.text()
        setBreakError(`Failed to start break: ${text}`)
      } else {
        const data: BreakStatusResponse = await res.json()
        // Immediately pause work on the UI
        setWorkData(prev => (prev ? { ...prev, status: 'paused' } : null))
        setBreakData(data)
        setShowPolicyDropdown(false)
        setSelectedPolicy(null)
      }
    } catch {
      setBreakError('Network error while starting break.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStopBreak = async () => {
    if (!token) {
      setBreakError('Cannot stop break: no token found.')
      return
    }
    setActionLoading(true)
    setBreakError(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/monitor/break/stop/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setBreakError(`Failed to stop break: ${text}`)
      } else {
        const data: {
          work_session: WorkStatusResponse
          break_session: BreakStatusResponse
        } = await res.json()

        setWorkData(data.work_session)
        setBreakData(data.break_session)
      }
    } catch {
      setBreakError('Network error while stopping break.')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── 7) Create BreakPolicy Handler ─────────────────────────────────────────────
  const handleCreatePolicy = async () => {
    if (!token) {
      setCreateError('Cannot create policy: no token found.')
      return
    }
    if (!breakName.trim()) {
      setCreateError('Policy name is required.')
      return
    }
    if (!type) {
      setCreateError('Policy type (Paid/Unpaid) is required.')
      return
    }
    if (!maxMinPerDay.trim() || isNaN(Number(maxMinPerDay))) {
      setCreateError('Max min per day must be a valid number.')
      return
    }

    setCreatingPolicy(true)
    setCreateError(null)

    try {
      const payload = {
        name: breakName.trim(),
        members: selectedMembers,
        apply_to_new: applyToNew,
        max_minutes_per_day: Number(maxMinPerDay),
        type,
      }

      const res = await fetch('http://127.0.0.1:8000/api/monitor/break/policies/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        setCreateError(`Failed to create policy: ${text}`)
      } else {
        // On success, clear inputs and re‐fetch policy list
        setBreakName('')
        setSelectedMembers([])
        setApplyToNew(false)
        setMaxMinPerDay('')
        setType(null)
        setShowCreateModal(false)

        // Refresh the list
        const updated = await fetch('http://127.0.0.1:8000/api/monitor/break/policies/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        })
        if (updated.ok) {
          const data: BreakPolicy[] = await updated.json()
          setPolicies(data)
        }
      }
    } catch {
      setCreateError('Network error while creating policy.')
    } finally {
      setCreatingPolicy(false)
    }
  }

  // ─── 8) Delete BreakPolicy Handler ─────────────────────────────────────────────
  const handleDeletePolicy = async (policyId: number) => {
    if (!token) return
    setDeletingId(policyId)
    setDeleteError(null)

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/monitor/break/policies/${policyId}/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        }
      )

      if (!res.ok) {
        const text = await res.text()
        setDeleteError(`Failed to delete: ${text}`)
      } else {
        // Refresh the list after deletion
        const updated = await fetch('http://127.0.0.1:8000/api/monitor/break/policies/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
        })
        if (updated.ok) {
          const data: BreakPolicy[] = await updated.json()
          setPolicies(data)
        }
      }
    } catch {
      setDeleteError('Network error while deleting policy.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── 9) Render loading / error states ────────────────────────────────────────
  if (loadingWork || loadingBreak || loadingPolicies) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading…</span>
        </Spinner>
      </div>
    )
  }

  if ((workError && !workData) || (breakError && !breakData) || (policiesError && policies.length === 0)) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Alert variant="danger">
          {workError || breakError || policiesError || 'Unknown error occurred.'}
        </Alert>
      </div>
    )
  }

  if (!workData || !breakData) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Alert variant="warning">
          Unable to load your sessions. Please check your login.
        </Alert>
      </div>
    )
  }

  return (
    <div className="container py-5">
     <div className="row">
      <div className="col-xl-4">
      <Card className="shadow mb-4 border-0">
        <Card.Body>
          <Card.Title className="text-center mb-4">
            {breakData.status === 'active' ? 'On Break' : 'Work Session'}
          </Card.Title>

          {(workError || breakError) && (
            <Alert
              variant="danger"
              onClose={() => {
                setWorkError(null)
                setBreakError(null)
              }}
              dismissible
              className="mb-3"
            >
              {workError || breakError}
            </Alert>
          )}

          <div className="d-flex mb-3 justify-content-between">
            <span  className="fw-bold">
              Status:
            </span>
            <span className="text-capitalize">
              {breakData.status === 'active' ? 'On Break' : workData.status}
            </span>
          </div>

          <div className="d-flex mb-3 justify-content-between">
            <div  className="fw-bold">
              Elapsed:
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight:"500" }}>
              {breakData.status === 'active'
                ? formatTime(breakData.total_seconds)
                : formatTime(workData.total_seconds)}
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3">
            {breakData.status === 'active' ? (
              <RBButton variant="warning" onClick={handleStopBreak} disabled={actionLoading}>
                {actionLoading ? (
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                ) : (
                  <FaStop className="me-1" />
                )}
                Stop Break
              </RBButton>
            ) : (
              <>
                <RBButton
                  variant={workData.status === 'active' ? ' theme-bg text-white d-flex align-items-center' : 'success'}
                  onClick={workData.status === 'active' ? handleStopWork : handleStartWork}
                  disabled={actionLoading}
                >
                  {actionLoading && (
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  )}
                  {workData.status === 'active' ? <FaPause className="me-1" /> : <FaPlay className="me-1" />}
                  {workData.status === 'active' ? 'Pause Work' : 'Start Work'}
                </RBButton>

                <RBButton className='d-flex align-items-center' variant="secondary" style={{background:"linear-gradient(45deg, #FF3028, #FD8916);"}} onClick={() => setShowPolicyDropdown(true)} disabled={actionLoading}>
                  <FaCoffee className="me-1" /> Take Break
                </RBButton>
              </>
            )}
          </div>
        </Card.Body>
      </Card>

      </div>
      <div className="col-xl-8">

      <Card className="shadow mb-4 border-0" style={{  }}>
        <Card.Body>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <span>Break Policies</span>
            <button className='g-btn' onClick={() => setShowCreateModal(true)}>
              + Create New Policy
            </button>
          </div>

          {deleteError && <Alert variant="danger">{deleteError}</Alert>}

          <div className="table-responsive">
            <table className="table table-bordered text-center mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Members Count</th>
                  <th>Max Min/Day</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>{policy.name}</td>
                    <td>{policy.members.length.toString().padStart(2, '0')}</td>
                    <td>{policy.max_minutes_per_day}</td>
                    <td>{policy.type}</td>
                    <td>
                      {/* If you want an “Edit” later, wire it up here */}
                      <button className="btn btn-sm btn-link text-primary me-2" disabled>
                        <FaEdit />
                      </button>

                      <button
                        className="btn btn-sm btn-link text-danger"
                        onClick={() => handleDeletePolicy(policy.id)}
                        disabled={deletingId === policy.id}
                      >
                        {deletingId === policy.id ? (
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {policies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      No break policies defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
      </div>
     </div>

      {/* ───────────────────── Policies Table ───────────────────── */}

      {/* ────────── Create Break Policy Modal ────────── */}
      {showCreateModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          aria-hidden="true"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content p-4">
              <h4 className="mb-4">Create Break Policy</h4>

              {createError && (
                <Alert variant="danger" onClose={() => setCreateError(null)} dismissible className="mb-3">
                  {createError}
                </Alert>
              )}

              <div className="mb-3">
                <label className="form-label">Name</label>
                <InputText
                  className="w-100"
                  placeholder="Break name"
                  value={breakName}
                  onChange={(e) => setBreakName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Members</label>
                <MultiSelect
                  value={selectedMembers}
                  options={SAMPLE_MEMBERS}
                  onChange={(e) => setSelectedMembers(e.value as number[])}
                  optionLabel="name"
                  optionValue="code"
                  placeholder="Select members"
                  className="w-100"
                />
                <div className="form-check mt-2">
                  <Checkbox inputId="applyNew" checked={applyToNew} onChange={(e) => setApplyToNew(e.checked!)} />
                  <label htmlFor="applyNew" className="form-check-label ms-2">
                    Apply to newly added members, too
                  </label>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">Max min per day</label>
                  <input
                    className="form-control"
                    value={maxMinPerDay}
                    onChange={(e) => setMaxMinPerDay(e.target.value)}
                    placeholder="e.g. 60"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Type</label>
                  <PrimeDropdown
                    value={type}
                    options={TYPE_OPTIONS}
                    onChange={(e) => setType(e.value as 'Paid' | 'Unpaid')}
                    placeholder="Select Type"
                    className="w-100"
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3">
                <button className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreatePolicy} disabled={creatingPolicy}>
                  {creatingPolicy && (
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  )}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────── Start Break Modal ────────── */}
      {showPolicyDropdown && (
        <>
          <div className="modal show fade d-block" tabIndex={-1}>
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Select Break Type</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPolicyDropdown(false)}></button>
                </div>
                <div className="modal-body">
                  <PrimeDropdown
                    value={selectedPolicy}
                    options={policies}
                    onChange={(e) => setSelectedPolicy(e.value as BreakPolicy)}
                    optionLabel="name"
                    placeholder="Choose a policy"
                    className="w-100"
                  />
                  {policies.length === 0 && <p className="text-muted mt-2">No policies available. Create one first.</p>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={handleStartBreak} disabled={!selectedPolicy || actionLoading}>
                    {actionLoading && (
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    )}
                    Start Break
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPolicyDropdown(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* ────────── Delete Confirmation is now inline in the table (no separate modal) ────────── */}

    </div>
  )
}
