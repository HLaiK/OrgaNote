import { useState, useEffect } from "react";
import { DeleteOutlined, CloseOutlined, CheckOutlined, EditOutlined } from "@ant-design/icons";
import { apiFetch } from "../api";

export default function KanbanView({ refreshTrigger, searchQuery = '' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const columns = [
    { id: "pending", title: "To Do", color: "var(--text-color, #2A2A2A)" },
    { id: "in-progress", title: "In Progress", color: "var(--btn-color, #A7C4A0)" },
    { id: "blocked", title: "Blocked", color: "#EF4444" },
    { id: "completed", title: "Done", color: "#81C784" },
  ];

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/tasks");
      setTasks(data);
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
      setTasks(tasks.filter((t) => t.id !== taskId));
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
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
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
    setEditingTask({ ...task });
  };

  const handleEditChange = (field, value) => {
    setEditingTask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitEdit = async () => {
    try {
      await apiFetch(`/tasks/${editingTask.id}`, {
        method: 'PUT',
        body: {
          title: editingTask.title,
          due_date: editingTask.due_date
        }
      });
      setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
      setEditingTask(null);
    } catch (err) {
      console.error('Update error:', err);
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
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return "";
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter((t) => 
      t.status === status && 
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#E57373";
      case "medium":
        return "#FFB74D";
      case "low":
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

  if (loading) {
    return (
      <div style={{ color: "var(--text-color, #2A2A2A)", padding: "20px" }}>
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#ff6b6b", padding: "20px" }}>
        {error}
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = getTasksByStatus("completed").length;

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
      {/* Kanban board */}
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
                dragOver === col.id
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.05)",
              border: `2px solid ${
                dragOver === col.id
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(255, 255, 255, 0.1)"
              }`,
              borderRadius: "10px",
              padding: "12px",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Column header */}
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

            {/* Cards */}
            <div className="kanban-column" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {getTasksByStatus(col.id).length === 0 ? (
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
                getTasksByStatus(col.id).map((task) => (
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
                        dragging?.taskId === task.id
                          ? "0 8px 16px rgba(0, 0, 0, 0.2)"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0, 0, 0, 0.15)";
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.15)";
                    }}
                  >
                    {/* Title and delete button */}
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
                          textDecoration:
                            task.status === "completed"
                              ? "line-through"
                              : "none",
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

                    {/* Task metadata */}
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        fontSize: "0.7rem",
                      }}
                    >
                      {/* Category tag */}
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

                      {/* Priority tag */}
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

                      {/* Due date */}
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
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Task Modal */}
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
