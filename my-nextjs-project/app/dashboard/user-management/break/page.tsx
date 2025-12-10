'use client'

import { useState, useEffect, useRef } from 'react'

import {
  Spinner,
  Alert,
  Button as RBButton,
  Card,
} from 'react-bootstrap'
import { FaPlay, FaPause, FaCoffee, FaStop, FaTrash, FaEdit, FaBug } from 'react-icons/fa'
import { InputText } from 'primereact/inputtext'
import { MultiSelect } from 'primereact/multiselect'
import { Dropdown as PrimeDropdown } from 'primereact/dropdown'
import { Checkbox } from 'primereact/checkbox'

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

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

type Project = {
  id: number
  name?: string
  slug?: string
}

const TYPE_OPTIONS = [
  { label: 'Paid', value: 'Paid' },
  { label: 'Unpaid', value: 'Unpaid' },
]

export default function Home() {
  // Shared State
  const [token, setToken] = useState<string | null>(null)

  // Projects & selection
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<number | null>(null)
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  // Work & Break state
  const [workData, setWorkData] = useState<WorkStatusResponse | null>(null)
  const [loadingWork, setLoadingWork] = useState(true)
  const [workError, setWorkError] = useState<string | null>(null)

  const [breakData, setBreakData] = useState<BreakStatusResponse | null>(null)
  const [loadingBreak, setLoadingBreak] = useState(true)
  const [breakError, setBreakError] = useState<string | null>(null)

  // Policies
  const [policies, setPolicies] = useState<BreakPolicy[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(true)
  const [policiesError, setPoliciesError] = useState<string | null>(null)

  // Members (fetched from API for policy creation)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false)
  const [membersError, setMembersError] = useState<string | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [breakName, setBreakName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [applyToNew, setApplyToNew] = useState(false)
  const [maxMinPerDay, setMaxMinPerDay] = useState('')
  const [type, setType] = useState<'Paid' | 'Unpaid' | null>(null)
  const [creatingPolicy, setCreatingPolicy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Start break modal
  const [showPolicyDropdown, setShowPolicyDropdown] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<BreakPolicy | null>(null)

  // delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Debug logs (client-side)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const pushDebug = (msg: string) => {
    setDebugLogs(prev => [msg, ...prev].slice(0, 200))
    console.debug('[monitor-debug]', msg)
  }

  // Ensure we only block full-screen until the *first* load attempt finishes
  const [firstLoaded, setFirstLoaded] = useState(false)

  // Helpers
  const getAuthHeaders = (tokenVal: string | null) => ({
    'Content-Type': 'application/json',
    Authorization: tokenVal ? `Token ${tokenVal}` : '',
  })

  const appendProject = (url: string, projId: number | null) =>
    projId ? `${url}${url.includes('?') ? '&' : '?'}project=${projId}` : url

  // robust fetch wrapper with debug info
  async function fetchWithDebug(url: string, opts: RequestInit = {}) {
    const start = Date.now()
    pushDebug(`-> ${opts.method || 'GET'} ${url}`)
    try {
      const res = await fetch(url, opts)
      const took = Date.now() - start
      const text = await res.text().catch(() => '')
      let parsed: any = null
      try {
        parsed = text ? JSON.parse(text) : null
      } catch (err) {
        parsed = null
      }
      pushDebug(`<- ${res.status} ${res.statusText} (${took}ms) ${url} bodyLen=${text.length}`)
      console.groupCollapsed(`fetch-debug ${opts.method || 'GET'} ${url}`)
      console.log('status', res.status, res.statusText)
      console.log('headers', Array.from(res.headers.entries()))
      console.log('text body', text)
      console.log('parsed json', parsed)
      console.groupEnd()

      return { ok: res.ok, status: res.status, statusText: res.statusText, text, json: parsed }
    } catch (err: any) {
      pushDebug(`!!! network error for ${url}: ${err?.message || err}`)
      console.error(err)
      return { ok: false, status: 0, statusText: 'network-error', text: '', json: null }
    }
  }

  // load token from localStorage once
  useEffect(() => {
    const t = localStorage.getItem('token')
    setToken(t)
  }, [])

  // fetch project list (explicit - user chooses project)
  const loadProjects = async () => {
    setLoadingProjects(true)
    setProjectsError(null)
    try {
      if (!token) {
        setProjectsError('No token found, please login.')
        setProjects([])
        return
      }
      const url = `${API_BASE_URL}/api/projects/`
      const res = await fetchWithDebug(url, { method: 'GET', headers: getAuthHeaders(token) })
      if (!res.ok) {
        setProjectsError(`Failed to fetch projects: ${res.status} ${res.statusText}`)
        setProjects([])
      } else {
        const data = res.json
        if (!Array.isArray(data)) {
          setProjectsError('Projects response not an array (see console/debug).')
          setProjects([])
        } else {
          setProjects(data as Project[])
          const saved = localStorage.getItem('project')
          if (saved && !isNaN(Number(saved))) {
            const n = Number(saved)
            if (data.some((p: Project) => p.id === n)) {
              setProjectId(n)
            }
          }
        }
      }
    } catch (err) {
      setProjectsError('Network error while fetching projects.')
      setProjects([])
    } finally {
      setLoadingProjects(false)
      // if this was the initial load attempt, ensure firstLoaded flips so UI displays
      setFirstLoaded(true)
    }
  }

  // fetch members (invited_by_me=1) — used in create policy modal
  const loadMembers = async () => {
    setLoadingMembers(true)
    setMembersError(null)
    setMembers([])

    try {
      if (!token) {
        setMembersError('No token found.')
        return
      }

      const url = `${API_BASE_URL}/api/members/?invited_by_me=1`
      const res = await fetchWithDebug(url, { method: 'GET', headers: getAuthHeaders(token) })
      if (!res.ok) {
        setMembersError(`Failed to fetch members: ${res.status} ${res.statusText}`)
        setMembers([])
        return
      }

      const data = res.json
      if (!Array.isArray(data)) {
        if (data && Array.isArray((data as any).results)) {
          const mapped = (data as any).results.map((m: any) => {
            const id = m.id ?? m.pk ?? m.user_id
            const name = m.full_name ?? m.display_name ?? m.username ?? m.name ?? `Member ${id}`
            return { name, code: id }
          })
          setMembers(mapped)
        } else {
          setMembersError('Members response not an array (see console).')
          setMembers([])
        }
      } else {
        const mapped = (data as any[]).map((m: any) => {
          const id = m.id ?? m.pk ?? m.user_id
          const name = m.full_name ?? m.display_name ?? m.username ?? m.name ?? `Member ${id}`
          return { name, code: id }
        })
        setMembers(mapped)
      }
    } catch (err) {
      setMembersError('Network error while fetching members.')
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  // fetch statuses & policies (explicit or on project change)
  const loadAll = async (projId: number | null) => {
    // Work status
    setLoadingWork(true)
    setWorkError(null)
    try {
      if (!token) throw new Error('no-token')
      const url = appendProject(`${API_BASE_URL}/api/monitor/status/`, projId)
      const res = await fetchWithDebug(url, { method: 'GET', headers: getAuthHeaders(token) })
      if (!res.ok) {
        const body = res.text || ''
        setWorkError(`Failed to fetch work status: ${res.status} ${body}`)
        setWorkData(null)
      } else {
        const data = res.json
        if (!data) {
          setWorkError('Work status returned empty payload (see console).')
          setWorkData(null)
        } else {
          setWorkData(data as WorkStatusResponse)
        }
      }
    } catch (err) {
      setWorkError('Network error while fetching work status.')
      setWorkData(null)
    } finally {
      setLoadingWork(false)
    }

    // Break status
    setLoadingBreak(true)
    setBreakError(null)
    try {
      if (!token) throw new Error('no-token')
      const url = appendProject(`${API_BASE_URL}/api/monitor/break/status/`, projId)
      const res = await fetchWithDebug(url, { method: 'GET', headers: getAuthHeaders(token) })
      if (!res.ok) {
        const body = res.text || ''
        setBreakError(`Failed to fetch break status: ${res.status} ${body}`)
        setBreakData(null)
      } else {
        const data = res.json
        if (!data) {
          setBreakError('Break status returned empty payload (see console).')
          setBreakData(null)
        } else {
          setBreakData(data as BreakStatusResponse)
        }
      }
    } catch (err) {
      setBreakError('Network error while fetching break status.')
      setBreakData(null)
    } finally {
      setLoadingBreak(false)
    }

    // Policies
    setLoadingPolicies(true)
    setPoliciesError(null)
    try {
      if (!token) throw new Error('no-token')
      const url = appendProject(`${API_BASE_URL}/api/monitor/break/policies/`, projId)
      const res = await fetchWithDebug(url, { method: 'GET', headers: getAuthHeaders(token) })
      if (!res.ok) {
        setPoliciesError(`Failed to fetch policies: ${res.status} ${res.text}`)
        setPolicies([])
      } else {
        const data = res.json
        if (!Array.isArray(data)) {
          setPoliciesError('Policies response is not an array (see console).')
          setPolicies([])
        } else {
          setPolicies(data as BreakPolicy[])
        }
      }
    } catch (err) {
      setPoliciesError('Network error while fetching policies.')
      setPolicies([])
    } finally {
      setLoadingPolicies(false)
      // mark first attempt finished (so UI no longer blocks)
      setFirstLoaded(true)
    }
  }

  // run once: load projects (after token is loaded)
  useEffect(() => {
    if (!token) return
    loadProjects()
    // prefetch members
    loadMembers()
  }, [token])

  // whenever projectId changes, persist and reload all data
  useEffect(() => {
    if (projectId) localStorage.setItem('project', String(projectId))
    loadAll(projectId)
  }, [projectId])

  // timer tick effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (breakData?.status === 'active') {
      intervalRef.current = setInterval(() => {
        setBreakData(prev => {
          if (!prev || prev.status !== 'active') return prev!
          return { ...prev, total_seconds: prev.total_seconds + 1 }
        })
      }, 1000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }

    if (workData?.status === 'active') {
      intervalRef.current = setInterval(() => {
        setWorkData(prev => {
          if (!prev || prev.status !== 'active') return prev!
          return { ...prev, total_seconds: prev.total_seconds + 1 }
        })
      }, 1000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [workData, breakData])

  // format time
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0')
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // Work handlers (use appendProject)
  const handleStartWork = async () => {
    setActionLoading(true)
    setWorkError(null)
    if (!token) { setWorkError('No token'); setActionLoading(false); return }
    const url = appendProject(`${API_BASE_URL}/api/monitor/start/`, projectId)
    const res = await fetchWithDebug(url, { method: 'POST', headers: getAuthHeaders(token) })
    if (!res.ok) setWorkError(`Failed to start work: ${res.status} ${res.text}`)
    else setWorkData(res.json as WorkStatusResponse)
    setActionLoading(false)
  }

  const handleStopWork = async () => {
    setActionLoading(true)
    setWorkError(null)
    if (!token) { setWorkError('No token'); setActionLoading(false); return }
    const url = appendProject(`${API_BASE_URL}/api/monitor/stop/`, projectId)
    const res = await fetchWithDebug(url, { method: 'POST', headers: getAuthHeaders(token) })
    if (!res.ok) setWorkError(`Failed to stop work: ${res.status} ${res.text}`)
    else setWorkData(res.json as WorkStatusResponse)
    setActionLoading(false)
  }

  // Break handlers
  const handleStartBreak = async () => {
    setActionLoading(true)
    setBreakError(null)
    if (!token) { setBreakError('No token'); setActionLoading(false); return }
    if (!selectedPolicy) { setBreakError('Select a policy'); setActionLoading(false); return }

    const url = appendProject(`${API_BASE_URL}/api/monitor/break/start/`, projectId)
    const res = await fetchWithDebug(url, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ policy_id: selectedPolicy.id }),
    })
    if (!res.ok) setBreakError(`Failed to start break: ${res.status} ${res.text}`)
    else {
      setBreakData(res.json as BreakStatusResponse)
      setWorkData(prev => prev ? { ...prev, status: 'paused' } : prev)
      setShowPolicyDropdown(false)
      setSelectedPolicy(null)
    }
    setActionLoading(false)
  }

  const handleStopBreak = async () => {
    setActionLoading(true)
    setBreakError(null)
    if (!token) { setBreakError('No token'); setActionLoading(false); return }
    const url = appendProject(`${API_BASE_URL}/api/monitor/break/stop/`, projectId)
    const res = await fetchWithDebug(url, { method: 'POST', headers: getAuthHeaders(token) })
    if (!res.ok) setBreakError(`Failed to stop break: ${res.status} ${res.text}`)
    else {
      const payload = res.json
      if (payload && payload.work_session) {
        setWorkData(payload.work_session)
        setBreakData(payload.break_session)
      } else {
        setBreakError('Unexpected stop-break payload (see console).')
      }
    }
    setActionLoading(false)
  }

  // create policy
  const handleCreatePolicy = async () => {
    setCreateError(null)
    if (!token) { setCreateError('No token'); return }
    if (!breakName.trim()) { setCreateError('Policy name required'); return }
    if (!type) { setCreateError('Type required'); return }
    if (!maxMinPerDay.trim() || isNaN(Number(maxMinPerDay))) { setCreateError('Max min/day must be a number'); return }

    setCreatingPolicy(true)
    const payload = {
      name: breakName.trim(),
      members: selectedMembers,
      apply_to_new: applyToNew,
      max_minutes_per_day: Number(maxMinPerDay),
      type,
    }
    const url = appendProject(`${API_BASE_URL}/api/monitor/break/policies/`, projectId)
    const res = await fetchWithDebug(url, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    })
    if (!res.ok) setCreateError(`Failed to create policy: ${res.status} ${res.text}`)
    else {
      setBreakName(''); setSelectedMembers([]); setApplyToNew(false); setMaxMinPerDay(''); setType(null)
      setShowCreateModal(false)
      await loadAll(projectId)
    }
    setCreatingPolicy(false)
  }

  const handleDeletePolicy = async (id: number) => {
    if (!token) return
    setDeletingId(id)
    setDeleteError(null)
    const url = appendProject(`${API_BASE_URL}/api/monitor/break/policies/${id}/`, projectId)
    const res = await fetchWithDebug(url, { method: 'DELETE', headers: getAuthHeaders(token) })
    if (!res.ok) setDeleteError(`Failed to delete: ${res.status} ${res.text}`)
    else await loadAll(projectId)
    setDeletingId(null)
  }

  // Open create modal — ensure members are loaded fresh
  const openCreateModal = async () => {
    setShowCreateModal(true)
    await loadMembers()
  }

  // UI render
  // show full-screen spinner only while the *first* load attempt is actively running
  const initialLoading = !firstLoaded && (loadingProjects || loadingWork || loadingBreak || loadingPolicies)

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading…</span>
        </Spinner>
      </div>
    )
  }

  // If totally no token
  if (!token) {
    return (
      <div className="container py-5">
        <Alert variant="warning">No token found. Please log in.</Alert>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row mb-3 g-4">
        <div className="col-lg-12">
          <Card className="p-3">
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <div className="">
                <strong>Select Project</strong>
                <select className="form-select w-auto" value={projectId ?? ''} onChange={(e) => {
                const v = e.target.value
                setProjectId(v ? Number(v) : null)
              }}>
                <option value=''>-- choose project --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name ?? `Project ${p.id}`}</option>)}
              </select>
              </div>
              
<div className="d-flex flex-wrap gap-2">

  <button className="btn btn g-btn ms-2" onClick={() => loadProjects()}>
                {loadingProjects ? (<><Spinner size="sm" /> Refreshing</>) : 'Refresh Projects'}
              </button>

              <button className="btn g-btn ms-2" onClick={() => loadAll(projectId)}>
                { (loadingWork || loadingBreak || loadingPolicies) ? (<><Spinner size="sm" /> Refreshing</>) : 'Refresh Status' }
              </button>

              <button className="btn g-btn ms-2 d-flex gap-1" onClick={() => {
                pushDebug('Open browser devtools -> Network & Console to inspect requests/responses.')
              }}>
                <FaBug /> Debug
              </button>
</div>
              
            </div>

            {projectsError && <Alert variant="warning" className="mt-2">{projectsError}</Alert>}
          </Card>
        </div>

        <div className="col-lg-12">
          <Card className="p-3">
            <div><strong>Selected</strong></div>
            <div>{projectId ? `Project ${projectId}` : 'None'}</div>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-4">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="text-center mb-4">
                {breakData?.status === 'active' ? 'On Break' : 'Work Session'}
              </Card.Title>

              {(workError || breakError) && (
                <Alert variant="danger" onClose={() => { setWorkError(null); setBreakError(null) }} dismissible className="mb-3">
                  {workError || breakError}
                </Alert>
              )}

              <div className="d-flex mb-3 justify-content-between">
                <span className="fw-bold">Status:</span>
                <span className="text-capitalize">{breakData?.status === 'active' ? 'On Break' : (workData?.status ?? 'unknown')}</span>
              </div>

              <div className="d-flex mb-3 justify-content-between">
                <div className="fw-bold">Elapsed:</div>
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: "500" }}>
                  { (loadingWork || loadingBreak) ? (<><Spinner size="sm" /> Loading...</>) :
                    (breakData?.status === 'active' ? formatTime(breakData.total_seconds) : formatTime(workData?.total_seconds ?? 0))}
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                {breakData?.status === 'active' ? (
                  <RBButton variant="warning" onClick={handleStopBreak} disabled={actionLoading}>
                    {actionLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <FaStop className="me-1" />}
                    Stop Break
                  </RBButton>
                ) : (
                  <>
                    <RBButton variant={workData?.status === 'active' ? 'theme-bg text-white d-flex align-items-center' : 'success d-flex align-items-center'} onClick={workData?.status === 'active' ? handleStopWork : handleStartWork} disabled={actionLoading}>
                      {actionLoading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
                      {workData?.status === 'active' ? <FaPause className="me-1" /> : <FaPlay className="me-1" />}
                      {workData?.status === 'active' ? 'Pause Work' : 'Start Work'}
                    </RBButton>

                    <RBButton className='d-flex align-items-center' variant="secondary" style={{ background: "linear-gradient(45deg, #FF3028, #FD8916);" }} onClick={() => setShowPolicyDropdown(true)} disabled={actionLoading || loadingPolicies}>
                      {loadingPolicies ? <><Spinner size="sm" className="me-1" /> Policies...</> : <><FaCoffee className="me-1" /> Take Break</>}
                    </RBButton>
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="col-xl-8">
          <Card className="mb-4">
            <Card.Body>
              <div className="mb-4 d-flex justify-content-between align-items-center">
                <span>Break Policies</span>
                <button className='g-btn' onClick={openCreateModal}>+ Create New Policy</button>
              </div>

              {deleteError && <Alert variant="danger">{deleteError}</Alert>}
              {policiesError && <Alert variant="warning">{policiesError}</Alert>}

              <div className="table-responsive">
                <table className="table g-table text-center mb-0">
                  <thead className="table-light">
                    <tr><th>Name</th><th>Members Count</th><th>Max Min/Day</th><th>Type</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {loadingPolicies ? (
                      <tr><td colSpan={5}><div className="py-3"><Spinner size="sm" /> Loading policies...</div></td></tr>
                    ) : policies.length === 0 ? (
                      <tr><td colSpan={5} className="text-muted">No break policies defined yet.</td></tr>
                    ) : policies.map((policy) => (
                      <tr key={policy.id}>
                        <td>{policy.name}</td>
                        <td>{policy.members.length.toString().padStart(2, '0')}</td>
                        <td>{policy.max_minutes_per_day}</td>
                        <td>{policy.type}</td>
                        <td>
                          <button className="btn btn-sm btn-link text-primary me-2" disabled><FaEdit /></button>
                          <button className="btn btn-sm btn-link text-danger" onClick={() => handleDeletePolicy(policy.id)} disabled={deletingId === policy.id}>
                            {deletingId === policy.id ? <Spinner as="span" animation="border" size="sm" /> : <FaTrash />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content p-4">
              <h4>Create Break Policy</h4>
              {createError && <Alert variant="danger">{createError}</Alert>}

              <div className="mb-3">
                <label className="form-label">Name</label>
                <InputText className="w-100" value={breakName} onChange={(e) => setBreakName(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Members</label>

                {loadingMembers ? (
                  <div className="py-2"><Spinner size="sm" /> Loading members...</div>
                ) : membersError ? (
                  <Alert variant="warning">{membersError}</Alert>
                ) : members.length === 0 ? (
                  <div className="text-muted">No invited members found (invited_by_me=1).</div>
                ) : (
                  <MultiSelect
                    value={selectedMembers}
                    options={members}
                    onChange={(e) => setSelectedMembers(e.value as number[])}
                    optionLabel="name"
                    optionValue="code"
                    placeholder="Select members"
                    className="w-100"
                  />
                )}

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
                  <input className="form-control" value={maxMinPerDay} onChange={(e) => setMaxMinPerDay(e.target.value)} placeholder="e.g. 60" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Type</label>
                  <PrimeDropdown value={type} options={TYPE_OPTIONS} onChange={(e) => setType(e.value as 'Paid' | 'Unpaid')} placeholder="Select Type" className="w-100" />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3">
                <button className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreatePolicy} disabled={creatingPolicy}>
                  {creatingPolicy && <Spinner as="span" animation="border" size="sm" className="me-2" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Break Modal */}
      {showPolicyDropdown && (
        <>
          <div className="modal show fade d-block">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5>Select Break Type</h5>
                  <button className="btn-close" onClick={() => setShowPolicyDropdown(false)} />
                </div>
                <div className="modal-body">
                  <PrimeDropdown value={selectedPolicy} options={policies} optionLabel="name" onChange={(e) => setSelectedPolicy(e.value as BreakPolicy)} className="w-100" />
                  {policies.length === 0 && <p className="text-muted mt-2">No policies available. Create one first.</p>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={handleStartBreak} disabled={!selectedPolicy || actionLoading}>
                    {actionLoading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
                    Start Break
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPolicyDropdown(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}

      {/* Debug Panel */}
      <div className="mt-4">
        <Card className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap">
            <strong>Client Debug (last requests)</strong>
            <div className='d-flex flex-wrap gap-2'>
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => { setDebugLogs([]); pushDebug('Cleared logs') }}>Clear</button>
              <a className="btn btn-sm btn-outline-primary" href="#" onClick={(e) => { e.preventDefault(); pushDebug('Open devtools network tab to inspect request/response details') }}>Console tips</a>
            </div>
          </div>

          {debugLogs.length === 0 ? <div className="text-muted">No debug logs yet. Use the buttons above to refresh or perform actions.</div> : (
            <ul className="small" style={{ maxHeight: 240, overflow: 'auto' }}>
              {debugLogs.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
