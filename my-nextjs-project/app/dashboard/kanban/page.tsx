"use client"

import React, { useEffect, useMemo, useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Clock, Filter } from "lucide-react"
import { format } from "date-fns"
import { Dropdown } from "primereact/dropdown"
import "primereact/resources/themes/lara-light-cyan/theme.css"
import "primereact/resources/primereact.min.css"

// Types and Interfaces
interface Task {
    id: string
    title: string
    description: string
    status: string
    priority: "low" | "medium" | "high" | "urgent" | string
    assignee: string
    dueDate: Date | null
    labels: string[]
    createdAt: Date
    updatedAt: Date
    estimatedHours?: number
    actualHours?: number
    _raw?: any
    _isAI?: boolean
}

interface Column {
    id: string
    title: string
    tasks: Task[]
    color: string
}

interface ProjectStats {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
}

// Default columns (keeps original design)
const initialColumns: Column[] = [
    { id: "backlog", title: "Backlog", color: "bg-light", tasks: [] },
    { id: "todo", title: "To Do", color: "bg-primary bg-opacity-10", tasks: [] },
    { id: "inprogress", title: "In Progress", color: "bg-warning bg-opacity-10", tasks: [] },
    { id: "review", title: "Code Review", color: "bg-info bg-opacity-10", tasks: [] },
    { id: "testing", title: "Testing", color: "bg-secondary bg-opacity-10", tasks: [] },
    { id: "done", title: "Done", color: "bg-success bg-opacity-10", tasks: [] },
]

// Mock fallback users/labels (kept from original design)
const users = [
    "John Doe",
    "Jane Smith",
    "Mike Johnson",
    "Sarah Wilson",
    "Alex Brown",
    "Emma Davis",
    "Chris Wilson",
    "Lisa Anderson",
]

const availableLabels = [
    "Design",
    "UI/UX",
    "Backend",
    "Frontend",
    "DevOps",
    "Security",
    "Review",
    "Planning",
    "Management",
    "Testing",
    "API",
    "Authentication",
    "Development",
    "Documentation",
    "Quality",
    "Setup",
]

// PrimeReact dropdown options (kept)
const priorityOptions = [
    { label: "All Priority", value: "all" },
    { label: "Urgent", value: "urgent" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
]

const assigneeOptions = [{ label: "All Assignees", value: "all" }, ...users.map((user) => ({ label: user, value: user }))]

// Utility: map server task payload to client Task shape (robust / tolerant)
// "source" = "human" | "ai"
function mapServerTaskToClient(t: any, source: "human" | "ai" = "human"): Task {
    const rawId = t.id ?? t.pk ?? t._id ?? t.task_id ?? (t._raw && (t._raw.id ?? t._raw.pk)) ?? Date.now()
    const idPrefix = source === "ai" ? "ai-" : ""
    const id = `${idPrefix}${String(rawId)}`

    const title = t.title ?? t.name ?? t.task ?? "Untitled"
    const description = t.description ?? t.notes ?? t.web_desc ?? ""

    // Normalize status to our column IDs
    const rawStatus = (t.status ?? t.state ?? t.stage ?? "").toString().toLowerCase()
    const allowed = new Set(["backlog", "todo", "inprogress", "review", "testing", "done"])
    let status = allowed.has(rawStatus) ? rawStatus : (t.project_status ?? rawStatus)
    if (!allowed.has(status)) status = "backlog"

    // Priority: accept strings or numeric
    let priority = (t.priority ?? t.prio ?? "").toString().toLowerCase()
    if (!["low", "medium", "high", "urgent"].includes(priority)) {
        const pnum = Number(priority)
        if (!isNaN(pnum)) {
            if (pnum >= 80) priority = "urgent"
            else if (pnum >= 60) priority = "high"
            else if (pnum >= 30) priority = "medium"
            else priority = "low"
        } else {
            priority = "medium"
        }
    }

    let assignee = ""
    if (typeof t.assignee === "string") assignee = t.assignee
    else if (typeof t.assignee === "number") assignee = String(t.assignee)
    else if (t.assignee && (t.assignee.name || t.assignee.username || t.assignee.full_name))
        assignee = t.assignee.name ?? t.assignee.username ?? t.assignee.full_name

    const dueDateRaw = t.due_date ?? t.deadline ?? t.due ?? t.dueDate ?? null
    let dueDate: Date | null = null
    if (dueDateRaw) {
        const parsed = new Date(dueDateRaw)
        if (!isNaN(parsed.getTime())) dueDate = parsed
    }

    const labels = Array.isArray(t.labels)
        ? t.labels.map(String)
        : typeof t.labels === "string"
        ? t.labels.split(",").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(t.tags)
        ? t.tags.map(String)
        : []

    const createdAt = t.created_at ? new Date(t.created_at) : t.createdAt ? new Date(t.createdAt) : new Date()
    const updatedAt = t.updated_at ? new Date(t.updated_at) : t.updatedAt ? new Date(t.updatedAt) : new Date()

    const estimatedHours = t.estimated_hours ?? t.estimated_time ?? t.estimate ?? null
    const actualHours = t.actual_hours ?? t.spent_hours ?? t.logged ?? 0

    return {
        id,
        title,
        description,
        status,
        priority,
        assignee: assignee || "",
        dueDate,
        labels,
        createdAt,
        updatedAt,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        actualHours: actualHours ? Number(actualHours) : undefined,
        _raw: t,
        _isAI: source === "ai",
    }
}

// Main Component (original design preserved, but wired to API)
export default function TaskManagementSystem() {
    // State Management
    const [columns, setColumns] = useState<Column[]>(initialColumns)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterPriority, setFilterPriority] = useState<string>("all")
    const [filterAssignee, setFilterAssignee] = useState<string>("all")
    const [filterLabels, setFilterLabels] = useState<string[]>([])
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [selectedLabels, setSelectedLabels] = useState<string[]>([])
    const [showTaskDropdown, setShowTaskDropdown] = useState<string | null>(null)
    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: "",
        description: "",
        priority: "medium",
        assignee: "",
        dueDate: null,
        labels: [],
        estimatedHours: 0,
    })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:8000/api"

    // Load tasks from API on mount (tries tasks/my, tasksai/my, falls back to /tasks/)
    useEffect(() => {
        let mounted = true
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

                // If no token, don't fail — show demo tasks
                if (!token) {
                    // use demo tasks (same as before) if user not signed in
                    const demoTasks: Task[] = [
                        {
                            id: "1",
                            title: "Design user interface mockups",
                            description: "Create wireframes and high-fidelity mockups for the new dashboard interface",
                            status: "backlog",
                            priority: "high",
                            assignee: "John Doe",
                            dueDate: new Date("2024-02-15"),
                            labels: ["Design", "UI/UX", "Frontend"],
                            createdAt: new Date("2024-01-01"),
                            updatedAt: new Date("2024-01-01"),
                            estimatedHours: 16,
                            actualHours: 0,
                        },
                        {
                            id: "3",
                            title: "Implement user authentication system",
                            description: "Add user login, registration, password reset functionality with JWT tokens",
                            status: "todo",
                            priority: "high",
                            assignee: "Mike Johnson",
                            dueDate: new Date("2024-02-20"),
                            labels: ["Backend", "Security", "Authentication"],
                            createdAt: new Date("2024-01-03"),
                            updatedAt: new Date("2024-01-05"),
                            estimatedHours: 24,
                            actualHours: 0,
                        },
                        {
                            id: "4",
                            title: "Develop REST API endpoints",
                            description: "Create all necessary API endpoints for task management functionality",
                            status: "inprogress",
                            priority: "high",
                            assignee: "Sarah Wilson",
                            dueDate: new Date("2024-02-18"),
                            labels: ["Backend", "API", "Development"],
                            createdAt: new Date("2024-01-04"),
                            updatedAt: new Date("2024-01-06"),
                            estimatedHours: 32,
                            actualHours: 12,
                        },
                    ]
                    const byStatus = initialColumns.map((c) => ({ ...c, tasks: demoTasks.filter((t) => t.status === c.id) }))
                    if (mounted) setColumns(byStatus)
                    return
                }

                // fetch human and ai endpoints in parallel (handle failures gracefully)
                const humanEp = `${API_BASE_URL}/tasks/my/`
                const aiEp = `${API_BASE_URL}/tasksai/my/`

                const [humanRes, aiRes] = await Promise.allSettled([
                    fetch(humanEp, { headers: { "Content-Type": "application/json", Authorization: `Token ${token}` } }),
                    fetch(aiEp, { headers: { "Content-Type": "application/json", Authorization: `Token ${token}` } }),
                ])

                const humanArr: any[] = []
                const aiArr: any[] = []

                if (humanRes.status === "fulfilled") {
                    try {
                        const r = humanRes.value
                        if (r.ok) {
                            const j = await r.json()
                            if (Array.isArray(j)) humanArr.push(...j)
                        }
                    } catch {
                        /* ignore */
                    }
                }

                if (aiRes.status === "fulfilled") {
                    try {
                        const r = aiRes.value
                        if (r.ok) {
                            const j = await r.json()
                            if (Array.isArray(j)) aiArr.push(...j)
                        }
                    } catch {
                        /* ignore */
                    }
                }

                // If both failed, try fallback to /tasks/
                if (humanArr.length === 0 && aiArr.length === 0) {
                    try {
                        const r = await fetch(`${API_BASE_URL}/tasks/`, { headers: { "Content-Type": "application/json", Authorization: `Token ${token}` } })
                        if (r.ok) {
                            const j = await r.json()
                            if (Array.isArray(j)) humanArr.push(...j)
                        }
                    } catch {
                        // ignore
                    }
                }

                // Map and merge
                const humanClient = humanArr.map((h) => mapServerTaskToClient(h, "human"))
                const aiClient = aiArr.map((a) => mapServerTaskToClient(a, "ai"))

                const allClient = [...humanClient, ...aiClient]

                if (allClient.length === 0) {
                    // if still empty, set demo tasks layout (same as before)
                    const demoTasks: Task[] = [
                        {
                            id: "1",
                            title: "Design user interface mockups",
                            description: "Create wireframes and high-fidelity mockups for the new dashboard interface",
                            status: "backlog",
                            priority: "high",
                            assignee: "John Doe",
                            dueDate: new Date("2024-02-15"),
                            labels: ["Design", "UI/UX", "Frontend"],
                            createdAt: new Date("2024-01-01"),
                            updatedAt: new Date("2024-01-01"),
                            estimatedHours: 16,
                            actualHours: 0,
                        },
                        {
                            id: "3",
                            title: "Implement user authentication system",
                            description: "Add user login, registration, password reset functionality with JWT tokens",
                            status: "todo",
                            priority: "high",
                            assignee: "Mike Johnson",
                            dueDate: new Date("2024-02-20"),
                            labels: ["Backend", "Security", "Authentication"],
                            createdAt: new Date("2024-01-03"),
                            updatedAt: new Date("2024-01-05"),
                            estimatedHours: 24,
                            actualHours: 0,
                        },
                        {
                            id: "4",
                            title: "Develop REST API endpoints",
                            description: "Create all necessary API endpoints for task management functionality",
                            status: "inprogress",
                            priority: "high",
                            assignee: "Sarah Wilson",
                            dueDate: new Date("2024-02-18"),
                            labels: ["Backend", "API", "Development"],
                            createdAt: new Date("2024-01-04"),
                            updatedAt: new Date("2024-01-06"),
                            estimatedHours: 32,
                            actualHours: 12,
                        },
                    ]
                    const byStatus = initialColumns.map((c) => ({ ...c, tasks: demoTasks.filter((t) => t.status === c.id) }))
                    if (mounted) setColumns(byStatus)
                } else {
                    const byStatus = initialColumns.map((c) => ({ ...c, tasks: allClient.filter((t) => t.status === c.id) }))
                    // extras -> backlog
                    const knownIds = new Set(initialColumns.map((c) => c.id))
                    const extras = allClient.filter((t) => !knownIds.has(t.status))
                    if (extras.length > 0) {
                        const backlog = byStatus.find((c) => c.id === "backlog")
                        if (backlog) backlog.tasks.push(...extras)
                    }
                    if (mounted) setColumns(byStatus)
                }
            } catch (err: any) {
                console.error("Failed to load tasks", err)
                if (mounted) setError(err.message || "Failed to load tasks")
            } finally {
                if (mounted) setLoading(false)
            }
        }

        load()
        return () => {
            mounted = false
        }
    }, [API_BASE_URL])

    // Calculate project statistics
    const calculateStats = (): ProjectStats => {
        const allTasks = columns.flatMap((col) => col.tasks)
        const totalTasks = allTasks.length
        const completedTasks = columns.find((col) => col.id === "done")?.tasks.length || 0
        const inProgressTasks = columns.find((col) => col.id === "inprogress")?.tasks.length || 0
        const overdueTasks = allTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done").length

        return { totalTasks, completedTasks, inProgressTasks, overdueTasks }
    }

    const stats = calculateStats()

    // Filter tasks based on search and filters
    const filteredColumns = columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
            const matchesSearch =
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesPriority = filterPriority === "all" || task.priority === filterPriority
            const matchesAssignee = filterAssignee === "all" || task.assignee === filterAssignee
            const matchesLabels = filterLabels.length === 0 || filterLabels.some((label) => task.labels.includes(label))

            return matchesSearch && matchesPriority && matchesAssignee && matchesLabels
        }),
    }))

    // Helper to determine API URL & raw id from task
    const getApiForTask = (task: Task) => {
        const isAi = !!task._isAI || String(task.id).startsWith("ai-")
        const rawId = isAi ? String(task.id).replace(/^ai-/, "") : String(task.id).replace(/^human-/, "")
        const url = `${API_BASE_URL}/${isAi ? "tasksai" : "tasks"}/${rawId}/`.replace(/\/\/+/g, "/").replace(":/", "://")
        return { url, isAi, rawId }
    }

    // Drag and Drop Handler — optimistic update + persist to API (supports AI & human)
    const handleDragEnd = async (result: any) => {
        if (!result.destination) return

        const { source, destination } = result

        // no-op
        if (source.droppableId === destination.droppableId && source.index === destination.index) return

        // Snapshot to rollback if needed
        const prev = JSON.parse(JSON.stringify(columns)) as Column[]

        // local update (immutably)
        const newCols = columns.map((c) => ({ ...c, tasks: [...c.tasks] }))
        const srcCol = newCols.find((c) => c.id === source.droppableId)
        const dstCol = newCols.find((c) => c.id === destination.droppableId)
        if (!srcCol || !dstCol) return

        const [movedTask] = srcCol.tasks.splice(source.index, 1)
        // update status and timestamp locally
        const updatedTask: Task = { ...movedTask, status: dstCol.id, updatedAt: new Date() }
        dstCol.tasks.splice(destination.index, 0, updatedTask)
        setColumns(newCols)

        // persist change to server -> choose tasksai vs tasks automatically
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
            if (!token) throw new Error("missing-token")

            const { url } = getApiForTask(movedTask)

            // first try { status }
            let res = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({ status: updatedTask.status }),
            })

            // if 400 try alternate field name 'state' (some serializers use different names)
            if (!res.ok && res.status === 400) {
                res = await fetch(url, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${token}`,
                    },
                    body: JSON.stringify({ state: updatedTask.status }),
                })
            }

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`)
            }

            const returned = await res.json()
            // use server response to update the item in-place (map server response)
            const mapped = mapServerTaskToClient(returned, String(returned.id ?? returned.pk ?? "").startsWith("ai-") || movedTask._isAI ? "ai" : "human")

            setColumns((prevCols) =>
                prevCols.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => {
                        if (t.id === movedTask.id) return mapped
                        return t
                    }),
                })),
            )
        } catch (err) {
            console.error("Failed to persist status change, rolling back", err)
            setColumns(prev)
        }
    }

    const deleteTask = (taskId: string) => {
        setColumns(
            columns.map((col) => ({
                ...col,
                tasks: col.tasks.filter((task) => task.id !== taskId),
            })),
        )
        setShowTaskDropdown(null)
    }

    const duplicateTask = (task: Task) => {
        const duplicatedTask: Task = {
            ...task,
            id: Date.now().toString(),
            title: `${task.title} (Copy)`,
            status: "backlog",
            createdAt: new Date(),
            updatedAt: new Date(),
            actualHours: 0,
        }

        setColumns(columns.map((col) => (col.id === "backlog" ? { ...col, tasks: [...col.tasks, duplicatedTask] } : col)))
        setShowTaskDropdown(null)
    }

    const getPriorityTextColor = (priority: string) => {
        switch (priority) {
            case "urgent":
                return "priority-urgent"
            case "high":
                return "priority-high"
            case "medium":
                return "priority-medium"
            case "low":
                return "priority-low"
            default:
                return "priority-normal"
        }
    }

    const isOverdue = (dueDate: Date | null, status: string) => {
        if (!dueDate || status === "done") return false
        return new Date(dueDate) < new Date()
    }

    const handleLabelToggle = (label: string, isForFilter = false) => {
        if (isForFilter) {
            setFilterLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
        } else {
            setSelectedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
        }
    }

    // Task Card Component (keeps original UI/structure)
    const TaskCard = ({ task, index }: { task: Task; index: number }) => (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card mb-3 shadow-sm border-0 ${snapshot.isDragging ? "shadow-lg" : ""} ${isOverdue(task.dueDate, task.status) ? "border-danger kanban-task-card bg-opacity-10" : ""}`}
                    style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        transform: snapshot.isDragging ? "rotate(2deg)" : "none",
                        ...provided.draggableProps.style,
                    }}
                >
                    <div className="card-header pb-2 border-0 bg-transparent">
                        <div className="d-flex align-items-start justify-content-between">
                            <div className="flex-grow-1">
                                <h6 className="card-title mb-1 fw-medium small mb-3" style={{ lineHeight: "1.2" }}>
                                    {task.title}
                                </h6>
                                <div className="d-flex align-items-center">
                                    <span className={`small fw-medium ${getPriorityTextColor(task.priority)}`}>{task.priority?.toString().toUpperCase()}</span>
                                </div>
                            </div>
                            <div className="dropdown">
                                <button
                                    className="btn btn-sm p-0 border-0 bg-transparent"
                                    type="button"
                                    onClick={() => setShowTaskDropdown(showTaskDropdown === task.id ? null : task.id)}
                                    style={{ width: "24px", height: "24px" }}
                                >
                                    <MoreHorizontal size={12} />
                                </button>
                                {showTaskDropdown === task.id && (
                                    <div className="dropdown-menu show position-absolute" style={{ right: 0, zIndex: 1000 }}>
                                        <button
                                            className="dropdown-item d-flex align-items-center"
                                            onClick={() => {
                                                setEditingTask(task)
                                                setSelectedLabels(task.labels)
                                                setShowTaskDropdown(null)
                                            }}
                                        >
                                            <Edit className="me-2" size={16} />
                                            Edit
                                        </button>
                                        <button className="dropdown-item d-flex align-items-center" onClick={() => duplicateTask(task)}>
                                            <Plus className="me-2" size={16} />
                                            Duplicate
                                        </button>
                                        <hr className="dropdown-divider" />
                                        <button className="dropdown-item d-flex align-items-center text-danger" onClick={() => deleteTask(task.id)}>
                                            <Trash2 className="me-2" size={16} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="card-body pt-0">
                        {task.description && (
                            <p
                                className="small text-muted mb-3"
                                style={{
                                    lineHeight: "1.3",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {task.description}
                            </p>
                        )}

                        {task.labels.length > 0 && (
                            <div className="d-flex flex-wrap mb-3" style={{ gap: "4px" }}>
                                {task.labels.slice(0, 3).map((label) => (
                                    <span key={label} className="badge kanban-task-tags small">
                                        {label}
                                    </span>
                                ))}
                                {task.labels.length > 3 && <span className="badge bg-outline-secondary small">+{task.labels.length - 3}</span>}
                            </div>
                        )}

                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-1">
                                <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.5 11.0132C8.26142 11.0132 10.5 8.77461 10.5 6.01318C10.5 3.25176 8.26142 1.01318 5.5 1.01318C2.73858 1.01318 0.5 3.25176 0.5 6.01318C0.5 8.77461 2.73858 11.0132 5.5 11.0132Z" stroke="#9844FF" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5.5 3.0116V6.0116L7.5 7.0116" stroke="#9844FF" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>

                                {task.estimatedHours && task.estimatedHours > 0 && (
                                    <span style={{ fontSize: "11px", color: "#9844FF", fontWeight: "500", lineHeight: "15px" }}>
                                        {task.actualHours || 0}h/{task.estimatedHours}h
                                    </span>
                                )}
                            </div>

                            <div className="d-flex align-items-center" style={{ gap: "2px" }}>
                                {task.dueDate && (
                                    <div className={`d-flex align-items-center small ${isOverdue(task.dueDate, task.status) ? "text-danger fw-medium" : "text-muted"}`} style={{ gap: "4px" }}>
                                        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.72222 4.90207H8.27778M2.72222 7.12429H5.5M2.72222 1.01318V2.12429M8.27778 1.01318V2.12429M2.27778 11.0132H8.72222C9.3445 11.0132 9.65567 11.0132 9.89333 10.8921C10.1024 10.7856 10.2724 10.6156 10.3789 10.4065C10.5 10.1689 10.5 9.85768 10.5 9.23541V3.90207C10.5 3.27979 10.5 2.96865 10.3789 2.73097C10.2724 2.5219 10.1024 2.35192 9.89333 2.2454C9.65567 2.12429 9.3445 2.12429 8.72222 2.12429H2.27778C1.6555 2.12429 1.34436 2.12429 1.10668 2.2454C0.897606 2.35192 0.727628 2.5219 0.621106 2.73097C0.5 2.96865 0.5 3.27979 0.5 3.90207V9.23541C0.5 9.85768 0.5 10.1689 0.621106 10.4065C0.727628 10.6156 0.897606 10.7856 1.10668 10.8921C1.34436 11.0132 1.65549 11.0132 2.27778 11.0132Z" stroke="#9844FF" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>

                                        <span style={{ fontSize: "11px", color: "#9844FF", fontWeight: "500", lineHeight: "15px" }}>{format(new Date(task.dueDate), "MMM dd")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    )

    return (
        <>
            <style jsx global>{`
        body {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          min-height: 100vh;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: "vertical";
          overflow: hidden;
        }
        .bg-opacity-10 {
          --bs-bg-opacity: 0.1;
        }
        .dragging-over {
          background-color: rgba(13, 110, 253, 0.1) !important;
        }
        .modal-backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }
        .p-dropdown {
          min-width: 120px;
        }
        .p-dropdown .p-dropdown-label {
          padding: 0.5rem 0.75rem;
        }
      `}</style>

            <div className="container-fluid p-4">
                <div className="row">
                    <div className="col-12">
                        {/* Header */} 
                        <div className="mb-4">
                            <div className=" row mb-3">
                                <div className=" col-lg-12 d-flex justify-content-between align-items-center gap-2">
                                    <h2 className=" page-heading-wrapper">Kanban Board</h2>
                                    <div className=" d-flex justify-content-between align-items-center gap-2"></div>
                                </div>
                            </div>

                            <div className="row g-4">
                                {/* stats cards preserved */}
                                <div className="col-md-3 col-sm-6">
                                    <div className="card stat-card text-white text-center p-3 card_bg_grad ">
                                        <div className="icon-circle mb-2">
                                            {/* SVG omitted for brevity */}
                                        </div>
                                        <div className="card-data-wrap">
                                            <h5 className="mb-0 fw-bold">{stats.totalTasks}</h5>
                                            <small>Total Task</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-3 col-sm-6">
                                    <div className="card stat-card text-white text-center p-3 card_bg_grad">
                                        <div className="icon-circle mb-2">
                                            {/* SVG omitted */}
                                        </div>
                                        <div className="card-data-wrap">
                                            <h5 className="mb-0 fw-bold">{stats.completedTasks}</h5>
                                            <small>Completed Task</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-3 col-sm-6">
                                    <div className="card stat-card text-white text-center p-3 card_bg_grad">
                                        <div className="icon-circle mb-2">
                                            {/* SVG omitted */}
                                        </div>
                                        <div className="card-data-wrap">
                                            <h5 className="mb-0 fw-bold">{stats.inProgressTasks}</h5>
                                            <small>In Progress</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-3 col-sm-6">
                                    <div className="card stat-card text-white text-center p-3 card_bg_grad">
                                        <div className="icon-circle mb-2">
                                            {/* SVG omitted */}
                                        </div>
                                        <div className="card-data-wrap">
                                            <h5 className="mb-0 fw-bold">{stats.overdueTasks}</h5>
                                            <small>Overdue</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="card border-0 multi-style mb-4 profile-settings-tabs-wrapper">
                            <div className="card-body p-3">
                                <div className="d-flex justify-content-start gap-3">
                                    <div className="position-relative">
                                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                        <input type="text" className="form-control ps-5" placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                    <div>
                                        <Dropdown value={filterPriority} options={priorityOptions} onChange={(e) => setFilterPriority(e.value)} placeholder="All Priority" className="w-100" />
                                    </div>

                                    <div>
                                        <Dropdown value={filterAssignee} options={assigneeOptions} onChange={(e) => setFilterAssignee(e.value)} placeholder="All Assignees" className="w-100" />
                                    </div>

                                    <div>
                                        <button className="btn btn-outline-secondary d-flex align-items-center w-100" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
                                            <Filter size={16} className="me-2" />
                                            Labels
                                            {filterLabels.length > 0 && <span className="badge bg-secondary ms-2">{filterLabels.length}</span>}
                                        </button>
                                        {isFiltersOpen && (
                                            <div className="card mt-2 position-absolute" style={{ zIndex: 1000, width: "300px" }}>
                                                <div className="card-body">
                                                    <h6 className="fw-medium mb-3">Filter by Labels</h6>
                                                    <div className="row g-2">
                                                        {availableLabels.map((label) => (
                                                            <div key={label} className="col-6">
                                                                <div className="form-check">
                                                                    <input className="form-check-input" type="checkbox" id={`filter-${label}`} checked={filterLabels.includes(label)} onChange={() => handleLabelToggle(label, true)} />
                                                                    <label className="form-check-label small" htmlFor={`filter-${label}`}>
                                                                        {label}
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {filterLabels.length > 0 && (
                                                        <button className="btn btn-outline-secondary btn-sm w-100 mt-3" onClick={() => setFilterLabels([])}>
                                                            Clear Filters
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kanban Board (dynamic) */}
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <div className="row g-3 kanban-row">
                                {filteredColumns.map((column) => (
                                    <div key={column.id} className="kanban-col col-12 col-md-6 col-lg-4 col-xl-2 rounded-3">
                                        <div className="card kanban-column-inner border-0 shadow-sm h-100 d-flex flex-column rounded-3">
                                            <div className={`card-header border-0`}>
                                                <div className="d-flex align-items-center justify-content-between w-100">
                                                    <h6 className="card-title mb-0 fw-semibold text-dark">{column.title}</h6>
                                                    <span className="badge bg-white bg-opacity-75 text-dark">{column.tasks.length}</span>
                                                </div>
                                            </div>

                                            <Droppable droppableId={column.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`card-body flex-grow-1 p-3 ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                                                        style={{ minHeight: "600px", transition: "background-color 0.2s ease" }}
                                                    >
                                                        {column.tasks.map((task, index) => (
                                                            <TaskCard key={task.id} task={task} index={index} />
                                                        ))}
                                                        {provided.placeholder}
                                                        {column.tasks.length === 0 && (
                                                            <div className="text-center text-muted mt-5">
                                                                <div style={{ fontSize: "3rem" }} className="mb-2">
                                                                    {/* empty state svg (kept from original) */}
                                                                    <svg className="mx-auto" width="107" height="90" viewBox="0 0 107 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        {/* preserved svg content removed for brevity */}
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DragDropContext>
                    </div>
                </div>
            </div>

            <style jsx>{`
    .kanban-row .kanban-col:nth-child(1) .kanban-column-inner >.card-header {
      height: 44px;
      background: #E8E8E8 !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row .kanban-col:nth-child(2) .kanban-column-inner >.card-header {
      height: 44px;
      background: #C4E3FF !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row .kanban-col:nth-child(3) .kanban-column-inner >.card-header {
      height: 44px;
      background: #FFF769 !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row .kanban-col:nth-child(4) .kanban-column-inner >.card-header {
      height: 44px;
      background: #E396FF !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row .kanban-col:nth-child(5) .kanban-column-inner >.card-header {
      height: 44px;
      background: #FFCF69 !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row .kanban-col:nth-child(6) .kanban-column-inner >.card-header {
      height: 44px;
      background: #69FFA5 !important;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      display: flex;
      align-items: center;
    }

    .kanban-row span.small.fw-medium.text-warning {
      padding: 3px 10px;
      height: 22px;
      background: #F8DD4E;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .kanban-task-card .priority-high {
      padding: 3px 10px;
      height: 22px;
      background: #F8DD4E;
      color: #000000;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .kanban-row .priority-urgent {
      padding: 3px 10px;
      height: 22px;
      background: #ff6060;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
    }

    .kanban-row .priority-medium {
      padding: 3px 10px;
      height: 22px;
      background: #7760ff;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
    }
    .kanban-row .priority-low {
      padding: 3px 10px;
      height: 22px;
      background: #6084ff;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
    }
    .kanban-row .kanban-task-tags {
      padding: 3px 10px;
      height: 22px;
      background: #E8E8E8;
      border-radius: 13px;
      color: black;
      display: flex;
      align-items: center;
      border: 0.4px solid #dfdfdf;
    }
    `}</style>
        </>
    )
}
