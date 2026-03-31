import { useEffect, useMemo, useRef, useState } from "react";
import {
  EditOutlined,
  CheckOutlined,
  DeleteOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { apiFetch } from "../api";

const UNGROUPED_ID = "__ungrouped__";
const TASK_REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At due time" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

export default function TasksPanel({
  refreshTrigger,
  searchQuery = "",
  taskFilters,
  taskSort,
  onTasksChanged,
  onAddTasks,
}) {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#4F46E5");
  const [selectNewGroupInEditingTask, setSelectNewGroupInEditingTask] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverGroupKey, setDragOverGroupKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearMenuOpen, setClearMenuOpen] = useState(false);
  const clearMenuRef = useRef(null);
  const groupListRef = useRef(null);

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

  const toApiDueDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value))) {
      return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const loadAll = async () => {
    try {
      const userId = localStorage.getItem("organote_user_id");
      if (!userId) {
        setError("No user ID found. Please refresh the page.");
        setLoading(false);
        return;
      }

      const [taskData, groupData] = await Promise.all([
        apiFetch("/tasks"),
        apiFetch("/task-groups"),
      ]);

      setTasks(taskData || []);
      setGroups(groupData || []);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
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

  const getPriorityValue = (task) => {
    if (task.priority === "high") return 3;
    if (task.priority === "medium") return 2;
    if (task.priority === "low") return 1;
    const parsed = Number(task.priority);
    return Number.isNaN(parsed) ? 0 : parsed;
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

  const isTaskCompleted = (task) => task?.status === "completed" || task?.status === true;

  const isOverdueTask = (task) => {
    if (!task?.due_date) return false;
    if (task.status === "completed") return false;
    const due = new Date(task.due_date);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  };

  const filteredTasks = useMemo(() => {
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

      // date-added default
      const aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      return safeSort.direction === "first" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [tasks, searchQuery, taskFilters, taskSort]);

  const groupedSections = useMemo(() => {
    const sortGroupTasks = (groupTasks) =>
      [...groupTasks].sort(
        (a, b) => Number(isTaskCompleted(a)) - Number(isTaskCompleted(b)),
      );

    const grouped = groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
      tasks: sortGroupTasks(filteredTasks.filter((task) => task.group_id === group.id)),
    }));

    grouped.push({
      id: UNGROUPED_ID,
      name: "Ungrouped",
      color: "rgba(255,255,255,0.35)",
      tasks: sortGroupTasks(filteredTasks.filter((task) => !task.group_id)),
      readOnly: true,
    });

    return grouped;
  }, [groups, filteredTasks]);

  const hasExpandedGroups = groupedSections.some((section) => !collapsedGroups[section.id]);

  const toggleAllGroups = () => {
    const collapseAll = hasExpandedGroups;
    const next = {};
    groupedSections.forEach((section) => {
      next[section.id] = collapseAll;
    });
    setCollapsedGroups(next);
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const newStatus =
        currentStatus === "completed" || currentStatus === true
          ? "pending"
          : "completed";
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { status: newStatus },
      });
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task,
          )
          .slice()
          .sort((a, b) => (a.status === "completed") - (b.status === "completed")),
      );
      onTasksChanged?.();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      onTasksChanged?.();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const clearAllTasks = async () => {
    const confirmed = window.confirm(
      "Delete ALL tasks? This will permanently remove every task in your database for this account.",
    );
    if (!confirmed) return;

    try {
      await apiFetch("/tasks", { method: "DELETE" });
      setTasks([]);
      onTasksChanged?.();
    } catch (err) {
      console.error("Error clearing all tasks:", err);
      alert("Failed to clear all tasks");
    }
  };

  const clearDoneTasks = async () => {
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
        completedTasks.map((task) =>
          apiFetch(`/tasks/${task.id}`, { method: "DELETE" }),
        ),
      );
      const completedIds = new Set(completedTasks.map((task) => task.id));
      setTasks((prev) => prev.filter((task) => !completedIds.has(task.id)));
      onTasksChanged?.();
    } catch (err) {
      console.error("Error clearing completed tasks:", err);
      alert("Failed to clear completed tasks");
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

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const moveTaskToGroup = async (taskId, nextGroupId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { group_id: nextGroupId },
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, group_id: nextGroupId } : task,
        ),
      );
      onTasksChanged?.();
    } catch (err) {
      console.error("Error moving task to group:", err);
    }
  };

  const handleTaskDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverGroupKey(null);
  };

  const autoScrollGroupList = (clientY) => {
    const container = groupListRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const threshold = 70;
    const maxStep = 18;

    if (clientY < bounds.top + threshold) {
      const intensity = Math.max(0, (bounds.top + threshold - clientY) / threshold);
      container.scrollTop -= Math.ceil(maxStep * intensity);
      return;
    }

    if (clientY > bounds.bottom - threshold) {
      const intensity = Math.max(0, (clientY - (bounds.bottom - threshold)) / threshold);
      container.scrollTop += Math.ceil(maxStep * intensity);
    }
  };

  const handleGroupDragOver = (e, groupKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    autoScrollGroupList(e.clientY);
    setDragOverGroupKey(groupKey);
  };

  const handleGroupDrop = async (e, targetGroupKey) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const task = tasks.find((t) => t.id === draggingTaskId);
    const nextGroupId = targetGroupKey === UNGROUPED_ID ? null : targetGroupKey;
    const currentGroupId = task?.group_id ?? null;

    setDragOverGroupKey(null);
    setDraggingTaskId(null);

    if (!task || currentGroupId === nextGroupId) return;
    await moveTaskToGroup(draggingTaskId, nextGroupId);
  };

  const handleEdit = (task) => {
    setEditingTask({ ...task, group_id: task.group_id ?? null });
  };

  const handleEditChange = (field, value) => {
    setEditingTask((current) => ({ ...current, [field]: value }));
  };

  const submitEdit = async () => {
    if (!editingTask) return;
    try {
      const body = {
        title: editingTask.title,
        description: editingTask.description,
        category: editingTask.category,
        priority: editingTask.priority && editingTask.priority !== "" ? editingTask.priority : null,
        due_date: toApiDueDate(editingTask.due_date),
        reminder_offset_minutes: editingTask.due_date
          ? editingTask.reminder_offset_minutes ?? null
          : null,
        group_id: editingTask.group_id || null,
      };

      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body,
      });

      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setEditingTask(null);
      onTasksChanged?.();
    } catch (err) {
      console.error("Error editing task:", err);
      alert("Failed to save task. Please try again.");
    }
  };

  const cancelEdit = () => setEditingTask(null);

  if (loading) {
    return <div style={styles.loadingText}>Loading tasks…</div>;
  }

  if (error) {
    return <div style={styles.errorText}>Error: {error}</div>;
  }

  return (
    <>
      <div style={styles.groupToolbar}>
        <span style={styles.groupToolbarLabel}>Task Groups</span>
        <div style={styles.groupToolbarActions}>
          <button
            style={styles.groupAddButton}
            onClick={toggleAllGroups}
            title={hasExpandedGroups ? "Collapse all groups" : "Expand all groups"}
          >
            {hasExpandedGroups ? "Collapse All" : "Expand All"}
          </button>
          <button style={styles.groupAddButton} onClick={() => onAddTasks?.()}>
            <PlusOutlined /> Add Tasks
          </button>
          <div style={styles.clearMenuWrapper} ref={clearMenuRef}>
            <button
              style={styles.groupAddButton}
              onClick={() => setClearMenuOpen((prev) => !prev)}
              title="Clear tasks options"
            >
              <DeleteOutlined /> Clear
            </button>
            {clearMenuOpen && (
              <div style={styles.clearMenu}>
                <button
                  style={styles.clearMenuItem}
                  onClick={async () => {
                    setClearMenuOpen(false);
                    await clearAllTasks();
                  }}
                >
                  Clear all tasks
                </button>
                <button
                  style={styles.clearMenuItem}
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
        ref={groupListRef}
        style={styles.groupListContainer}
        onDragOver={(e) => autoScrollGroupList(e.clientY)}
      >
        {groupedSections.every((section) => section.tasks.length === 0) ? (
          <div style={styles.emptyText}>No tasks yet. Add some using the input below!</div>
        ) : (
          groupedSections.map((section) => {
            const isCollapsed = !!collapsedGroups[section.id];
            return (
              <div
                key={section.id}
                style={{
                  ...styles.groupSection,
                  border:
                    dragOverGroupKey === section.id
                      ? "1px solid rgba(255,255,255,0.55)"
                      : "1px solid rgba(255,255,255,.15)",
                  background:
                    dragOverGroupKey === section.id
                      ? "rgba(255,255,255,0.08)"
                      : styles.groupSection.background,
                }}
                onDragOver={(e) => handleGroupDragOver(e, section.id)}
                onDrop={(e) => handleGroupDrop(e, section.id)}
              >
                <div
                  style={{ ...styles.groupHeader, borderLeft: `4px solid ${section.color}` }}
                >
                  <button
                    style={styles.groupToggleButton}
                    onClick={() => toggleGroupCollapse(section.id)}
                    title={isCollapsed ? "Expand group" : "Collapse group"}
                  >
                    <span style={styles.groupName}>{section.name}</span>
                    <span style={styles.groupMeta}>
                      {section.tasks.length} · {isCollapsed ? "Collapsed" : "Expanded"}
                    </span>
                  </button>

                  {!section.readOnly && (
                    <div style={styles.groupActions}>
                      <input
                        type="color"
                        value={section.color || "#4F46E5"}
                        title="Group color"
                        style={styles.groupColorPicker}
                        onChange={(e) => changeGroupColor(section.id, e.target.value)}
                      />
                      <button
                        style={styles.groupActionBtn}
                        onClick={() => openRenameGroupModal(section)}
                        title="Rename group"
                      >
                        <EditOutlined />
                      </button>
                      <button
                        style={styles.groupActionBtn}
                        onClick={() => deleteGroup(section.id)}
                        title="Delete group"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <ul style={styles.list}>
                    {section.tasks.length === 0 ? (
                      <li
                        style={{
                          ...styles.item,
                          justifyContent: "center",
                          color: "rgba(255,255,255,0.55)",
                          fontStyle: "italic",
                        }}
                      >
                        Drop task here
                      </li>
                    ) : section.tasks.map((task) => (
                      <li
                        key={task.id}
                        style={{ ...styles.item, cursor: "grab", opacity: draggingTaskId === task.id ? 0.6 : 1 }}
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, task.id)}
                        onDragEnd={handleTaskDragEnd}
                      >
                        <div style={styles.itemContent}>
                          <div style={styles.taskInfo}>
                            <div
                              style={{
                                ...styles.title,
                                textDecoration:
                                  task.status === "completed" ? "line-through" : "none",
                              }}
                            >
                              {task.title}
                            </div>
                            {task.due_date && (
                              <div style={styles.date}>
                                Due: {new Date(task.due_date).toLocaleDateString()} at{" "}
                                {new Date(task.due_date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                                alignItems: "center",
                                fontSize: "0.7rem",
                                marginTop: "8px",
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
                              {task.group_id && groups.length > 0 && (
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
                                  {groups.find((g) => g.id === task.group_id)?.name || "Group"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={styles.actions}>
                            <button
                              style={styles.editButton}
                              onClick={() => handleEdit(task)}
                              title="Edit"
                            >
                              <EditOutlined />
                            </button>
                            <button
                              style={styles.checkButton}
                              onClick={() => handleToggleComplete(task.id, task.status)}
                              title="Mark complete"
                            >
                              <CheckOutlined />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {editingTask && (
        <div style={modalStyles.overlay} onClick={cancelEdit}>
          <div style={modalStyles.editModal} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexShrink: 0,
              }}
            >
              <h3 style={modalStyles.title}>Edit Task</h3>
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

            <div style={modalStyles.editBody}>
              <div>
                <label style={modalStyles.label}>Title</label>
                <input
                  style={modalStyles.input}
                  value={editingTask.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div>
                <label style={modalStyles.label}>Group</label>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={createGroupForEditingTask}
                    style={modalStyles.groupCreateButton}
                  >
                    <PlusOutlined /> Create new group
                  </button>
                </div>
                <select
                  style={{ ...modalStyles.input, backgroundColor: "rgba(40,40,40,0.5)" }}
                  value={editingTask.group_id || ""}
                  onChange={(e) =>
                    handleEditChange(
                      "group_id",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
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
                <label style={modalStyles.label}>Due date & time</label>
                <input
                  type="datetime-local"
                  style={{ ...modalStyles.input, marginBottom: 0 }}
                  value={
                    editingTask.due_date ? localDateTimeForInput(editingTask.due_date) : ""
                  }
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
                />
              </div>

              <div>
                <label style={modalStyles.label}>Priority</label>
                <select
                  style={{ ...modalStyles.input, backgroundColor: "rgba(40,40,40,0.5)" }}
                  value={editingTask.priority || ""}
                  onChange={(e) => handleEditChange("priority", e.target.value || null)}
                >
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {editingTask.due_date && (
                <div>
                  <label style={modalStyles.label}>Reminder</label>
                  <select
                    style={{ ...modalStyles.input, backgroundColor: "rgba(40,40,40,0.5)" }}
                    value={editingTask.reminder_offset_minutes ?? ""}
                    onChange={(e) =>
                      handleEditChange(
                        "reminder_offset_minutes",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
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
                style={modalStyles.saveBtn}
                onClick={submitEdit}
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
                style={modalStyles.cancelBtn}
                onClick={cancelEdit}
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
        <div style={modalStyles.overlay} onClick={cancelCreateGroup}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={modalStyles.title}>Create Group</h3>
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <label style={modalStyles.label}>Group Name</label>
                <input
                  style={{ ...modalStyles.input, marginBottom: 0 }}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name (e.g., School, Work, Class 1)"
                />
              </div>

              <div>
                <label style={modalStyles.label}>Group Color</label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  style={{
                    width: "48px",
                    height: "38px",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={modalStyles.saveBtn}
                onClick={submitCreateGroup}
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
                style={modalStyles.cancelBtn}
                onClick={cancelCreateGroup}
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
        <div style={modalStyles.overlay} onClick={cancelRenameGroup}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={modalStyles.title}>Rename Group</h3>
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <label style={modalStyles.label}>Group Name</label>
                <input
                  style={{ ...modalStyles.input, marginBottom: 0 }}
                  value={renameGroupName}
                  onChange={(e) => setRenameGroupName(e.target.value)}
                  placeholder="Rename group"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={modalStyles.saveBtn}
                onClick={submitRenameGroup}
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
                style={modalStyles.cancelBtn}
                onClick={cancelRenameGroup}
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
    </>
  );
}

const styles = {
  loadingText: {
    color: "var(--text-color, rgba(255,255,255,0.7))",
    fontSize: "0.95rem",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "0.95rem",
    padding: "10px",
    background: "rgba(255, 107, 107, 0.1)",
    borderRadius: "6px",
  },
  emptyText: {
    color: "var(--text-color, rgba(255,255,255,0.7))",
    fontSize: "0.95rem",
  },
  groupToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  groupToolbarLabel: {
    color: "var(--text-color, #2A2A2A)",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  groupToolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  groupAddButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "6px 10px",
    color: "var(--text-color, #2A2A2A)",
    cursor: "pointer",
  },
  clearMenuWrapper: {
    position: "relative",
  },
  clearMenu: {
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
  },
  clearMenuItem: {
    width: "100%",
    background: "transparent",
    border: "none",
    textAlign: "left",
    padding: "10px 12px",
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  groupListContainer: {
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  groupSection: {
    background: "rgba(255,255,255,0.08)",
    border: "2px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    padding: "8px",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "8px",
    marginBottom: "8px",
  },
  groupToggleButton: {
    background: "none",
    border: "none",
    color: "var(--text-color, #2A2A2A)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2px",
    cursor: "pointer",
    padding: 0,
  },
  groupName: {
    fontWeight: "700",
    fontSize: "0.9rem",
  },
  groupMeta: {
    fontSize: "0.75rem",
    opacity: 0.8,
  },
  groupActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  groupColorPicker: {
    width: "28px",
    height: "28px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  groupActionBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)",
    color: "var(--text-color, #2A2A2A)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  item: {
    background: "rgba(255,255,255,0.1)",
    border: "2px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    padding: "12px",
    backdropFilter: "blur(5px)",
  },
  itemContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "var(--text-color, white)",
    wordBreak: "break-word",
  },
  date: {
    fontSize: "0.8rem",
    color: "var(--text-color, rgba(255,255,255,0.7))",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  editButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.27)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "16px",
    boxSizing: "border-box",
  },
  modal: {
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    backdropFilter: "blur(10px)",
  },
  editModal: {
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
  },
  editBody: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflowY: "auto",
    paddingRight: "6px",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    marginBottom: 24,
    fontSize: "1.8rem",
    fontWeight: "bold",
    color: "var(--text-color, white)",
    fontStyle: "italic",
  },
  label: {
    fontSize: "0.95rem",
    marginTop: 0,
    marginBottom: 8,
    display: "block",
    fontWeight: "600",
    color: "var(--text-color, rgba(255,255,255,0.9))",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "2px solid rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "var(--text-color, white)",
    fontFamily: "inherit",
    backdropFilter: "blur(5px)",
    marginBottom: "16px",
    boxSizing: "border-box",
    fontSize: "0.95rem",
  },
  groupCreateButton: {
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
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "rgba(255,255,255,0.2)",
    color: "var(--text-color, white)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    color: "var(--text-color, white)",
    fontSize: "1rem",
    transition: "all 0.2s",
  },
};
