import { useEffect, useMemo, useRef, useState } from "react";
import {
  DeleteOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { apiFetch } from "../api";
import useViewport from "../hooks/useViewport";

const UNGROUPED_ID = "__ungrouped__";
const TASK_REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At due time" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "10080", label: "1 week before" },
];

export default function KanbanView({
  refreshTrigger,
  searchQuery = "",
  taskFilters,
  taskSort,
  onTasksChanged,
  onAddTasks,
}) {
  const { isPhone, isTablet, isLandscape } = useViewport();
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [groupDragOver, setGroupDragOver] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#4F46E5");
  const [selectNewGroupInEditingTask, setSelectNewGroupInEditingTask] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [clearMenuOpen, setClearMenuOpen] = useState(false);
  const clearMenuRef = useRef(null);
  const boardRef = useRef(null);
  const isPhoneLandscape = isPhone && isLandscape;
  const compactBoardMaxHeight = isPhone ? "62vh" : isTablet ? "68vh" : null;

  const columns = [
    { id: "pending", title: "To Do", color: "var(--text-color, #2A2A2A)" },
    { id: "in-progress", title: "In Progress", color: "var(--btn-color, #A7C4A0)" },
    { id: "blocked", title: "Blocked", color: "#EF4444" },
    { id: "completed", title: "Done", color: "#81C784" },
  ];

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (clearMenuRef.current && !clearMenuRef.current.contains(event.target)) {
        setClearMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [taskData, groupData] = await Promise.all([
        apiFetch("/tasks"),
        apiFetch("/task-groups"),
      ]);
      setTasks(taskData || []);
      setGroups(groupData || []);
    } catch (err) {
      setError("Failed to load tasks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(taskId) {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      onTasksChanged?.();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function clearAllTasks() {
    const confirmed = window.confirm(
      "Delete ALL tasks? This will permanently remove every task in your database for this account.",
    );
    if (!confirmed) return;

    try {
      await apiFetch("/tasks", { method: "DELETE" });
      setTasks([]);
      onTasksChanged?.();
    } catch (err) {
      console.error("Clear all tasks error:", err);
      alert("Failed to clear all tasks");
    }
  }

  async function clearDoneTasks() {
    const completedTasks = tasks.filter(
      (task) => task.status === "completed" || task.status === true,
    );

    if (completedTasks.length === 0) {
      alert("No completed tasks to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${completedTasks.length} completed task${completedTasks.length === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(
        completedTasks.map((task) => apiFetch(`/tasks/${task.id}`, { method: "DELETE" })),
      );
      const completedIds = new Set(completedTasks.map((task) => task.id));
      setTasks((prev) => prev.filter((task) => !completedIds.has(task.id)));
      onTasksChanged?.();
    } catch (err) {
      console.error("Clear done tasks error:", err);
      alert("Failed to clear completed tasks");
    }
  }

  async function updateTaskStatus(taskId, newStatus, nextGroupId) {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: {
          status: newStatus,
          ...(nextGroupId !== undefined ? { group_id: nextGroupId } : {}),
        },
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                ...(nextGroupId !== undefined ? { group_id: nextGroupId } : {}),
              }
            : task,
        ),
      );
      onTasksChanged?.();
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  const handleDragStart = (e, taskId, fromStatus, fromGroupId) => {
    setDragging({ taskId, fromStatus, fromGroupId: fromGroupId ?? null });
    e.dataTransfer.effectAllowed = "move";
  };

  const autoScrollBoard = (clientX, clientY) => {
    const board = boardRef.current;
    if (!board) return;

    const bounds = board.getBoundingClientRect();
    const threshold = 70;
    const maxStep = 18;

    if (clientY < bounds.top + threshold) {
      const intensity = Math.max(0, (bounds.top + threshold - clientY) / threshold);
      board.scrollTop -= Math.ceil(maxStep * intensity);
    } else if (clientY > bounds.bottom - threshold) {
      const intensity = Math.max(0, (clientY - (bounds.bottom - threshold)) / threshold);
      board.scrollTop += Math.ceil(maxStep * intensity);
    }

    if (clientX < bounds.left + threshold) {
      const intensity = Math.max(0, (bounds.left + threshold - clientX) / threshold);
      board.scrollLeft -= Math.ceil(maxStep * intensity);
    } else if (clientX > bounds.right - threshold) {
      const intensity = Math.max(0, (clientX - (bounds.right - threshold)) / threshold);
      board.scrollLeft += Math.ceil(maxStep * intensity);
    }
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    autoScrollBoard(e.clientX, e.clientY);
    setDragOver(colId);
    setGroupDragOver(null);
  };

  const handleGroupDragOver = (e, statusId, groupId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    autoScrollBoard(e.clientX, e.clientY);
    setDragOver(statusId);
    setGroupDragOver(`${statusId}-${groupId}`);
  };

  const handleDrop = async (e, toStatus) => {
    e.preventDefault();
    if (!dragging) {
      setDragging(null);
      setDragOver(null);
      setGroupDragOver(null);
      return;
    }

    if (dragging.fromStatus === toStatus) {
      setDragging(null);
      setDragOver(null);
      setGroupDragOver(null);
      return;
    }

    await updateTaskStatus(dragging.taskId, toStatus);
    setDragging(null);
    setDragOver(null);
    setGroupDragOver(null);
  };

  const handleGroupDrop = async (e, statusId, groupId) => {
    e.preventDefault();
    if (!dragging) return;

    const nextGroupId = groupId === UNGROUPED_ID ? null : groupId;
    const noChange =
      dragging.fromStatus === statusId &&
      (dragging.fromGroupId ?? null) === (nextGroupId ?? null);

    setDragging(null);
    setDragOver(null);
    setGroupDragOver(null);

    if (noChange) return;
    await updateTaskStatus(dragging.taskId, statusId, nextGroupId);
  };

  const handleEdit = (task) => {
    setEditingTask({ ...task, group_id: task.group_id ?? null });
  };

  const handleEditChange = (field, value) => {
    setEditingTask((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toApiDueDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value))) {
      return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const submitEdit = async () => {
    try {
      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body: {
          title: editingTask.title,
          due_date: toApiDueDate(editingTask.due_date),
          reminder_offset_minutes: editingTask.due_date
            ? editingTask.reminder_offset_minutes ?? null
            : null,
          group_id: editingTask.group_id || null,
          priority: editingTask.priority && editingTask.priority !== "" ? editingTask.priority : null,
        },
      });
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setEditingTask(null);
      onTasksChanged?.();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to save task. Please try again.");
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
  };

  const localDateTimeForInput = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const getPriorityValue = (task) => {
    if (task.priority === "high") return 3;
    if (task.priority === "medium") return 2;
    if (task.priority === "low") return 1;
    const parsed = Number(task.priority);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const isOverdueTask = (task) => {
    if (!task?.due_date) return false;
    if (task.status === "completed") return false;
    const due = new Date(task.due_date);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  };

  const processedTasks = useMemo(() => {
    const safeFilters = taskFilters || {
      status: "all",
      priority: "all",
      category: "all",
      dueDate: "any",
    };
    const safeSort = taskSort || { sortBy: "date-added", direction: "last" };
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - dayStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let result = tasks.filter((task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (safeFilters.status === "to-do") {
      result = result.filter(
        (task) => task.status !== "completed" && task.status !== "in-progress",
      );
    } else if (safeFilters.status === "in-progress") {
      result = result.filter((task) => task.status === "in-progress");
    } else if (safeFilters.status === "done") {
      result = result.filter((task) => task.status === "completed");
    } else if (safeFilters.status === "overdue") {
      result = result.filter((task) => isOverdueTask(task));
    }

    if (safeFilters.priority !== "all") {
      const target = safeFilters.priority === "high" ? 3 : safeFilters.priority === "medium" ? 2 : 1;
      result = result.filter((task) => getPriorityValue(task) === target);
    }

    if (safeFilters.category === "ungrouped") {
      result = result.filter((task) => !task.group_id);
    } else if (safeFilters.category !== "all") {
      const targetGroupId = Number(safeFilters.category);
      result = result.filter((task) => Number(task.group_id) === targetGroupId);
    }

    if (safeFilters.dueDate === "today") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= dayStart && due < dayEnd;
      });
    } else if (safeFilters.dueDate === "this-week") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= weekStart && due < weekEnd;
      });
    } else if (safeFilters.dueDate === "this-month") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= monthStart && due < nextMonthStart;
      });
    } else if (safeFilters.dueDate === "past-due") {
      result = result.filter((task) => isOverdueTask(task));
    } else if (safeFilters.dueDate === "no-date") {
      result = result.filter((task) => !task.due_date);
    }

    result.sort((a, b) => {
      if (safeSort.sortBy === "due-date") {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        return safeSort.direction === "desc" ? bDue - aDue : aDue - bDue;
      }

      if (safeSort.sortBy === "priority") {
        const delta = getPriorityValue(b) - getPriorityValue(a);
        return safeSort.direction === "low" ? -delta : delta;
      }

      if (safeSort.sortBy === "alpha") {
        const delta = (a.title || "").localeCompare(b.title || "");
        return safeSort.direction === "za" ? -delta : delta;
      }

      if (safeSort.sortBy === "modified") {
        const aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return safeSort.direction === "not-recent" ? aVal - bVal : bVal - aVal;
      }

      const aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      return safeSort.direction === "first" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [tasks, searchQuery, taskFilters, taskSort]);

  const getTasksByStatus = (status) => {
    return processedTasks.filter((task) => task.status === status);
  };

  const getGroupedSectionsByStatus = (status) => {
    const statusTasks = getTasksByStatus(status);
    const sections = groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
      tasks: statusTasks.filter((task) => task.group_id === group.id),
    }));

    sections.push({
      id: UNGROUPED_ID,
      name: "Ungrouped",
      color: "rgba(255,255,255,0.35)",
      tasks: statusTasks.filter((task) => !task.group_id),
      readOnly: true,
    });

    return sections;
  };

  const getVisibleGroupedSectionsByStatus = (status) => {
    const sections = getGroupedSectionsByStatus(status);
    return sections.filter((section) => section.tasks.length > 0);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
      case 3:
        return "#E57373";
      case "medium":
      case 2:
        return "#FFB74D";
      case "low":
      case 1:
        return "#81C784";
      default:
        return "var(--btn-color, #A7C4A0)";
    }
  };

  const getPriorityLabel = (priority) => {
    if (!priority) return "";
    switch (String(priority)) {
      case "3":
      case "high":
        return "High";
      case "2":
      case "medium":
        return "Medium";
      case "1":
      case "low":
        return "Low";
      default:
        return String(priority);
    }
  };

  const getCategoryBg = (category) => {
    switch (category) {
      case "work":
        return "rgba(59, 130, 246, 0.1)";
      case "school":
        return "rgba(168, 85, 247, 0.1)";
      case "personal":
        return "rgba(236, 72, 153, 0.1)";
      case "other":
        return "rgba(107, 114, 128, 0.1)";
      default:
        return "rgba(255, 255, 255, 0.05)";
    }
  };

  const openCreateGroupModal = (selectInEditingTask = false) => {
    setSelectNewGroupInEditingTask(selectInEditingTask);
    setNewGroupName("");
    setNewGroupColor("#4F46E5");
    setCreatingGroup(true);
  };

  const cancelCreateGroup = () => {
    setCreatingGroup(false);
    setNewGroupName("");
    setNewGroupColor("#4F46E5");
    setSelectNewGroupInEditingTask(false);
  };

  const submitCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const created = await apiFetch("/task-groups", {
        method: "POST",
        body: { name: newGroupName.trim(), color: newGroupColor || "#4F46E5" },
      });
      setGroups((prev) => [...prev, created]);
      if (selectNewGroupInEditingTask && editingTask) {
        handleEditChange("group_id", created.id);
      }
      cancelCreateGroup();
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
    }
  };

  const createGroup = async () => {
    openCreateGroupModal(false);
  };

  const createGroupForEditingTask = async () => {
    openCreateGroupModal(true);
  };

  const openRenameGroupModal = (group) => {
    setRenamingGroup(group);
    setRenameGroupName(group?.name || "");
  };

  const cancelRenameGroup = () => {
    setRenamingGroup(null);
    setRenameGroupName("");
  };

  const submitRenameGroup = async () => {
    if (!renamingGroup) return;
    const trimmedName = renameGroupName.trim();
    if (!trimmedName || trimmedName === renamingGroup.name) {
      cancelRenameGroup();
      return;
    }

    try {
      const updated = await apiFetch(`/task-groups/${renamingGroup.id}`, {
        method: "PUT",
        body: { name: trimmedName },
      });
      setGroups((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      cancelRenameGroup();
    } catch (err) {
      console.error("Error renaming group:", err);
      alert("Failed to rename group");
    }
  };

  const changeGroupColor = async (groupId, color) => {
    try {
      const updated = await apiFetch(`/task-groups/${groupId}`, {
        method: "PUT",
        body: { color },
      });
      setGroups((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error("Error updating group color:", err);
    }
  };

  const deleteGroup = async (groupId) => {
    const confirmed = window.confirm(
      "Delete this group? Tasks will remain and become ungrouped.",
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/task-groups/${groupId}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      setTasks((prev) =>
        prev.map((task) =>
          task.group_id === groupId ? { ...task, group_id: null } : task,
        ),
      );
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete group");
    }
  };

  const toggleGroupCollapse = (statusId, groupId) => {
    const key = `${statusId}-${groupId}`;
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groupNameMap = useMemo(() => {
    const map = new Map();
    for (const group of groups) {
      map.set(group.id, group.name);
    }
    return map;
  }, [groups]);

  const allCollapseKeys = useMemo(() => {
    const keys = [];
    columns.forEach((col) => {
      groups.forEach((group) => {
        keys.push(`${col.id}-${group.id}`);
      });
      keys.push(`${col.id}-${UNGROUPED_ID}`);
    });
    return keys;
  }, [groups]);

  const hasExpandedGroups = allCollapseKeys.some((key) => !collapsedGroups[key]);

  const toggleAllGroups = () => {
    const collapseAll = hasExpandedGroups;
    const next = {};
    allCollapseKeys.forEach((key) => {
      next[key] = collapseAll;
    });
    setCollapsedGroups(next);
  };

  if (loading) {
    return <div style={{ color: "var(--text-color, #2A2A2A)", padding: "20px" }}>Loading tasks...</div>;
  }

  if (error) {
    return <div style={{ color: "#ff6b6b", padding: "20px" }}>{error}</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--text-color, #2A2A2A)", fontWeight: "600", fontSize: "0.9rem" }}>
          Task Groups
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "var(--text-color, #2A2A2A)",
              cursor: "pointer",
            }}
            onClick={toggleAllGroups}
            title={hasExpandedGroups ? "Collapse all groups" : "Expand all groups"}
          >
            {hasExpandedGroups ? "Collapse All" : "Expand All"}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "var(--text-color, #2A2A2A)",
              cursor: "pointer",
            }}
            onClick={() => onAddTasks?.()}
          >
            <PlusOutlined /> Add Tasks
          </button>
          <div style={{ position: "relative" }} ref={clearMenuRef}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.2)",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text-color, #2A2A2A)",
                cursor: "pointer",
              }}
              onClick={() => setClearMenuOpen((prev) => !prev)}
              title="Clear tasks options"
            >
              <DeleteOutlined /> Clear
            </button>
            {clearMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: "170px",
                  background: "rgba(40,40,40,0.9)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  zIndex: 20,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <button
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.95)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                  onClick={async () => {
                    setClearMenuOpen(false);
                    await clearAllTasks();
                  }}
                >
                  Clear all tasks
                </button>
                <button
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.95)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                  onClick={async () => {
                    setClearMenuOpen(false);
                    await clearDoneTasks();
                  }}
                >
                  Clear done tasks
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="kanban-board"
        ref={boardRef}
        onDragOver={(e) => autoScrollBoard(e.clientX, e.clientY)}
        style={{
          display: isPhoneLandscape ? "grid" : "flex",
          gridTemplateColumns: isPhoneLandscape ? "repeat(2, minmax(0, 1fr))" : undefined,
          alignItems: "flex-start",
          gap: isPhoneLandscape ? "8px" : "12px",
          overflowX: isPhoneLandscape ? "hidden" : "scroll",
          overflowY: "auto",
          padding: "0 4px 8px 4px",
          flex: 1,
          minHeight: 0,
          maxHeight: compactBoardMaxHeight || undefined,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              minWidth: isPhoneLandscape ? 0 : "220px",
              flex: isPhoneLandscape ? undefined : "1 1 auto",
              background:
                dragOver === col.id ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
              border: `2px solid ${
                dragOver === col.id ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"
              }`,
              borderRadius: "10px",
              padding: isPhoneLandscape ? "8px" : "12px",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              minHeight: isPhoneLandscape ? "calc((62vh - 24px) / 2)" : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isPhoneLandscape ? "6px" : "8px",
                marginBottom: isPhoneLandscape ? "8px" : "12px",
                paddingBottom: isPhoneLandscape ? "6px" : "10px",
                borderBottom: `2px solid ${col.color}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: col.color,
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  margin: 0,
                  fontSize: isPhoneLandscape ? "0.78rem" : "0.9rem",
                  fontWeight: "600",
                  color: "var(--text-color, #2A2A2A)",
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {col.title}
              </h3>
              <span
                style={{
                  fontSize: isPhoneLandscape ? "0.68rem" : "0.75rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--text-color, #2A2A2A)",
                  padding: isPhoneLandscape ? "2px 6px" : "2px 8px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  flexShrink: 0,
                }}
              >
                {getTasksByStatus(col.id).length}
              </span>
            </div>

            <div className="kanban-column" style={{ display: "flex", flexDirection: "column", gap: isPhoneLandscape ? "8px" : "10px", minHeight: 0, overflowY: "auto" }}>
              {getVisibleGroupedSectionsByStatus(col.id).length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-color, rgba(42, 42, 42, 0.5))",
                    padding: isPhoneLandscape ? "16px 8px" : "24px 12px",
                    fontSize: isPhoneLandscape ? "0.78rem" : "0.9rem",
                  }}
                >
                  No tasks
                </div>
              ) : (
                getVisibleGroupedSectionsByStatus(col.id).map((section) => {
                  const collapseKey = `${col.id}-${section.id}`;
                  const isCollapsed = !!collapsedGroups[collapseKey];
                  const isGroupDropTarget = groupDragOver === `${col.id}-${section.id}`;

                  return (
                    <div
                      key={section.id}
                      style={{
                        border: isGroupDropTarget
                          ? "1px solid rgba(255,255,255,0.55)"
                          : "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        padding: "8px",
                        background: isGroupDropTarget
                          ? "rgba(255,255,255,0.08)"
                          : "transparent",
                      }}
                      onDragOver={(e) => handleGroupDragOver(e, col.id, section.id)}
                      onDrop={(e) => handleGroupDrop(e, col.id, section.id)}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: isPhoneLandscape ? "6px" : "8px",
                          borderLeft: `4px solid ${section.color}`,
                          paddingLeft: isPhoneLandscape ? "6px" : "8px",
                          marginBottom: isCollapsed ? 0 : "8px",
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-color, #2A2A2A)",
                            padding: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "2px",
                            minWidth: 0,
                          }}
                          onClick={() => toggleGroupCollapse(col.id, section.id)}
                        >
                          <span style={{ fontWeight: 700, fontSize: isPhoneLandscape ? "0.72rem" : "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{section.name}</span>
                          <span style={{ fontSize: isPhoneLandscape ? "0.62rem" : "0.68rem", opacity: 0.75 }}>
                            {section.tasks.length} · {isCollapsed ? "Collapsed" : "Expanded"}
                          </span>
                        </button>

                        {!section.readOnly && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                            <input
                              type="color"
                              value={section.color || "#4F46E5"}
                              style={{ width: isPhoneLandscape ? "20px" : "24px", height: isPhoneLandscape ? "20px" : "24px", border: "none", background: "transparent", padding: 0 }}
                              onChange={(e) => changeGroupColor(section.id, e.target.value)}
                            />
                            <button
                              style={{ background: "none", border: "none", color: "var(--text-color, #2A2A2A)", opacity: 0.7, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                              onClick={() => openRenameGroupModal(section)}
                              title="Rename group"
                            >
                              <EditOutlined />
                            </button>
                            <button
                              style={{ background: "none", border: "none", color: "var(--text-color, #2A2A2A)", opacity: 0.7, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                              onClick={() => deleteGroup(section.id)}
                              title="Delete group"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        )}
                      </div>

                      {!isCollapsed &&
                        (section.tasks.length === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              color: "var(--text-color, rgba(42, 42, 42, 0.55))",
                              fontSize: "0.75rem",
                              fontStyle: "italic",
                              padding: "10px 4px",
                            }}
                          >
                            Drop task here
                          </div>
                        ) : section.tasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id, task.status, task.group_id)}
                            onDragEnd={() => {
                              setDragging(null);
                              setDragOver(null);
                              setGroupDragOver(null);
                            }}
                            style={{
                              background: getCategoryBg(task.category),
                              border: `2px solid rgba(255, 255, 255, 0.15)`,
                              borderRadius: "8px",
                              padding: "10px",
                              cursor: "grab",
                              opacity: dragging?.taskId === task.id ? 0.5 : 1,
                              transition: "all 0.2s",
                              boxShadow:
                                dragging?.taskId === task.id ? "0 8px 16px rgba(0, 0, 0, 0.2)" : "none",
                              marginBottom: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "6px",
                                marginBottom: "8px",
                              }}
                            >
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  color: "var(--text-color, #2A2A2A)",
                                  lineHeight: 1.3,
                                  flex: 1,
                                  wordBreak: "break-word",
                                  textDecoration: task.status === "completed" ? "line-through" : "none",
                                }}
                              >
                                {task.title}
                              </h4>
                              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                <button
                                  onClick={() => handleEdit(task)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--text-color, #2A2A2A)",
                                    opacity: 0.6,
                                    fontSize: "1rem",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Edit task"
                                >
                                  <EditOutlined />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--text-color, #2A2A2A)",
                                    opacity: 0.6,
                                    fontSize: "1rem",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Delete task"
                                >
                                  <DeleteOutlined />
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                                alignItems: "center",
                                fontSize: "0.7rem",
                              }}
                            >
                              {task.category && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: "600",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.15)",
                                    color: "var(--text-color, #2A2A2A)",
                                    textTransform: "capitalize",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {task.category}
                                </span>
                              )}

                              {task.priority && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: "600",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: getPriorityColor(task.priority),
                                    color: "#FFFFFF",
                                    textTransform: "capitalize",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {getPriorityLabel(task.priority)}
                                </span>
                              )}

                              {task.group_id && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: "600",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: "rgba(79,70,229,0.18)",
                                    color: "var(--text-color, #2A2A2A)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {groupNameMap.get(task.group_id) || "Group"}
                                </span>
                              )}

                              {task.due_date && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-color, rgba(42, 42, 42, 0.7))",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {new Date(task.due_date).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        )))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {editingTask && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.27)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
            boxSizing: "border-box",
          }}
          onClick={cancelEdit}
        >
          <div
            style={{
              border: "2px solid rgba(255,255,255,0.4)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              maxHeight: "85vh",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold", color: "var(--text-color, white)", fontStyle: "italic" }}>Edit Task</h3>
              <button
                onClick={cancelEdit}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-color, white)",
                  fontSize: "1.8rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", paddingRight: "6px", marginBottom: "4px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Title
                </label>
                <input
                  type="text"
                  value={editingTask.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                  placeholder="Task title"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Group
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={createGroupForEditingTask}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(255,255,255,0.2)",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      color: "var(--text-color, white)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    <PlusOutlined /> Create new group
                  </button>
                </div>
                <select
                  value={editingTask.group_id || ""}
                  onChange={(e) =>
                    handleEditChange("group_id", e.target.value ? Number(e.target.value) : null)
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(40,40,40,0.5)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                >
                  <option value="">Ungrouped</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editingTask.due_date ? localDateTimeForInput(editingTask.due_date) : ""}
                  onChange={(e) => {
                    const nextDueDate = e.target.value ? e.target.value : null;
                    setEditingTask((current) => ({
                      ...current,
                      due_date: nextDueDate,
                      reminder_offset_minutes: nextDueDate
                        ? current.reminder_offset_minutes ?? 15
                        : null,
                    }));
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Priority
                </label>
                <select
                  value={editingTask.priority || ""}
                  onChange={(e) => handleEditChange("priority", e.target.value || null)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(40,40,40,0.5)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                >
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {editingTask.due_date && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                    Reminder
                  </label>
                  <select
                    value={editingTask.reminder_offset_minutes ?? ""}
                    onChange={(e) =>
                      handleEditChange(
                        "reminder_offset_minutes",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      backgroundColor: "rgba(40,40,40,0.5)",
                      color: "var(--text-color, white)",
                      fontFamily: "inherit",
                      backdropFilter: "blur(5px)",
                    }}
                  >
                    {TASK_REMINDER_OPTIONS.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", flexShrink: 0, marginTop: "20px" }}>
              <button
                onClick={submitEdit}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--btn-color, #A7C4A0)";
                  e.target.style.borderColor = "var(--btn-color, #A7C4A0)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                  e.target.style.borderColor = "rgba(255,255,255,0.3)";
                }}
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {creatingGroup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.27)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
          onClick={cancelCreateGroup}
        >
          <div
            style={{
              border: "2px solid rgba(255,255,255,0.4)",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              backdropFilter: "blur(10px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold", color: "var(--text-color, white)", fontStyle: "italic" }}>Create Group</h3>
              <button
                onClick={cancelCreateGroup}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-color, white)",
                  fontSize: "1.8rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                  placeholder="Group name (e.g., School, Work, Class 1)"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Group Color
                </label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  style={{ width: "48px", height: "38px", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={submitCreateGroup}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--btn-color, #A7C4A0)";
                  e.target.style.borderColor = "var(--btn-color, #A7C4A0)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                  e.target.style.borderColor = "rgba(255,255,255,0.3)";
                }}
              >
                Create
              </button>
              <button
                onClick={cancelCreateGroup}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {renamingGroup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.27)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1150,
          }}
          onClick={cancelRenameGroup}
        >
          <div
            style={{
              border: "2px solid rgba(255,255,255,0.4)",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "500px",
              width: "90%",
              backdropFilter: "blur(10px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold", color: "var(--text-color, white)", fontStyle: "italic" }}>Rename Group</h3>
              <button
                onClick={cancelRenameGroup}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-color, white)",
                  fontSize: "1.8rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-color, rgba(255,255,255,0.9))" }}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={renameGroupName}
                  onChange={(e) => setRenameGroupName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "var(--text-color, white)",
                    fontFamily: "inherit",
                    backdropFilter: "blur(5px)",
                  }}
                  placeholder="Rename group"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={submitRenameGroup}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--btn-color, #A7C4A0)";
                  e.target.style.borderColor = "var(--btn-color, #A7C4A0)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                  e.target.style.borderColor = "rgba(255,255,255,0.3)";
                }}
              >
                Save
              </button>
              <button
                onClick={cancelRenameGroup}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "var(--text-color, white)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
