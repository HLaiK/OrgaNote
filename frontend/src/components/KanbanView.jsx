import { useEffect, useMemo, useState } from "react";
import {
  DeleteOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { apiFetch } from "../api";

const UNGROUPED_ID = "__ungrouped__";

export default function KanbanView({ refreshTrigger, searchQuery = "" }) {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const columns = [
    { id: "pending", title: "To Do", color: "var(--text-color, #2A2A2A)" },
    { id: "in-progress", title: "In Progress", color: "var(--btn-color, #A7C4A0)" },
    { id: "blocked", title: "Blocked", color: "#EF4444" },
    { id: "completed", title: "Done", color: "#81C784" },
  ];

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

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
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function updateTaskStatus(taskId, newStatus) {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { status: newStatus },
      });
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)),
      );
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  const handleDragStart = (e, taskId, fromStatus) => {
    setDragging({ taskId, fromStatus });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(colId);
  };

  const handleDrop = async (e, toStatus) => {
    e.preventDefault();
    if (!dragging || dragging.fromStatus === toStatus) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    await updateTaskStatus(dragging.taskId, toStatus);
    setDragging(null);
    setDragOver(null);
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

  const submitEdit = async () => {
    try {
      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body: {
          title: editingTask.title,
          due_date: editingTask.due_date,
          group_id: editingTask.group_id || null,
        },
      });
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setEditingTask(null);
    } catch (err) {
      console.error("Update error:", err);
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

  const getTasksByStatus = (status) => {
    return tasks.filter(
      (task) => task.status === status && task.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
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

  const createGroup = async () => {
    const name = window.prompt("Group name (e.g., School, Work, Class 1)");
    if (!name || !name.trim()) return;

    try {
      const created = await apiFetch("/task-groups", {
        method: "POST",
        body: { name: name.trim(), color: "#4F46E5" },
      });
      setGroups((prev) => [...prev, created]);
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
    }
  };

  const renameGroup = async (group) => {
    const name = window.prompt("Rename group", group.name || "");
    if (!name || !name.trim() || name.trim() === group.name) return;

    try {
      const updated = await apiFetch(`/task-groups/${group.id}`, {
        method: "PUT",
        body: { name: name.trim() },
      });
      setGroups((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
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
        }}
      >
        <span style={{ color: "var(--text-color, #2A2A2A)", fontWeight: "600", fontSize: "0.9rem" }}>
          Task Groups
        </span>
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
          onClick={createGroup}
        >
          <PlusOutlined /> New Group
        </button>
      </div>

      <div
        className="kanban-board"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          overflowX: "scroll",
          overflowY: "auto",
          padding: "0 4px 8px 4px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              minWidth: "220px",
              flex: "1 1 auto",
              background:
                dragOver === col.id ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
              border: `2px solid ${
                dragOver === col.id ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"
              }`,
              borderRadius: "10px",
              padding: "12px",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                paddingBottom: "10px",
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
                  fontSize: "0.9rem",
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
                  fontSize: "0.75rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--text-color, #2A2A2A)",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  flexShrink: 0,
                }}
              >
                {getTasksByStatus(col.id).length}
              </span>
            </div>

            <div className="kanban-column" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {getGroupedSectionsByStatus(col.id).every((section) => section.tasks.length === 0) ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-color, rgba(42, 42, 42, 0.5))",
                    padding: "24px 12px",
                    fontSize: "0.9rem",
                  }}
                >
                  No tasks
                </div>
              ) : (
                getGroupedSectionsByStatus(col.id).map((section) => {
                  if (section.tasks.length === 0 && section.id === UNGROUPED_ID) {
                    return null;
                  }

                  const collapseKey = `${col.id}-${section.id}`;
                  const isCollapsed = !!collapsedGroups[collapseKey];

                  return (
                    <div key={section.id} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          borderLeft: `4px solid ${section.color}`,
                          paddingLeft: "8px",
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
                          }}
                          onClick={() => toggleGroupCollapse(col.id, section.id)}
                        >
                          <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{section.name}</span>
                          <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>
                            {section.tasks.length} · {isCollapsed ? "Collapsed" : "Expanded"}
                          </span>
                        </button>

                        {!section.readOnly && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              type="color"
                              value={section.color || "#4F46E5"}
                              style={{ width: "24px", height: "24px", border: "none", background: "transparent", padding: 0 }}
                              onChange={(e) => changeGroupColor(section.id, e.target.value)}
                            />
                            <button
                              style={{ background: "none", border: "none", color: "var(--text-color, #2A2A2A)", opacity: 0.7, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                              onClick={() => renameGroup(section)}
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
                        section.tasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id, task.status)}
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
                                {task.category || "no category"}
                              </span>

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
                                  {task.priority}
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
                        ))}
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
          }}
          onClick={cancelEdit}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
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
                    backgroundColor: "rgba(255,255,255,0.1)",
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
                  onChange={(e) => handleEditChange("due_date", e.target.value ? e.target.value : null)}
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
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
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
    </div>
  );
}
