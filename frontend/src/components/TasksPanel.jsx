import { useEffect, useState } from "react";
import { EditOutlined, CheckOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import { apiFetch } from "../api";

export default function TasksPanel({ refreshTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // helper to format any stored due_date into a value suitable for <input type="datetime-local">
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

  const loadTasks = async () => {
    try {
      const userId = localStorage.getItem("organote_user_id");
      if (!userId) {
        setError("No user ID found. Please refresh the page.");
        setLoading(false);
        return;
      }

      const data = await apiFetch("/tasks");
      setTasks(data || []);
      setError(null);
    } catch (err) {
      console.error("Error loading tasks:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === "completed" || currentStatus === true ? "pending" : "completed";
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { status: newStatus }
      });
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
        // move completed tasks to bottom
        return updated.slice().sort((a, b) => (a.status === "completed") - (b.status === "completed"));
      });
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "DELETE"
      });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleEdit = (task) => {
    setEditingTask({ ...task });
  };

  const handleEditChange = (field, value) => {
    setEditingTask((t) => ({ ...t, [field]: value }));
  };

  const submitEdit = async () => {
    if (!editingTask) return;
    try {
      const body = {
        title: editingTask.title,
        description: editingTask.description,
        category: editingTask.category,
        priority: editingTask.priority,
        due_date: editingTask.due_date
      };

      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body
      });

      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
    } catch (err) {
      console.error("Error editing task:", err);
    }
  };

  const cancelEdit = () => setEditingTask(null);

  if (loading) {
    return <div style={styles.loadingText}>Loading tasks…</div>;
  }

  if (error) {
    return <div style={styles.errorText}>Error: {error}</div>;
  }

  if (tasks.length === 0) {
    return <div style={styles.emptyText}>No tasks yet. Add some using the input below!</div>;
  }

  return (
    <>
      <ul style={styles.list}>
        {tasks.map((task) => (
          <li key={task.id} style={styles.item}>
            <div style={styles.itemContent}>
              <div style={styles.taskInfo}>
                <div style={{ ...styles.title, textDecoration: task.status === "completed" ? "line-through" : "none" }}>
                  {task.title}
                </div>
                {task.due_date && (
                  <div style={styles.date}>
                    Due: {new Date(task.due_date).toLocaleDateString()} at {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
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
                  onClick={() => handleDelete(task.id)}
                  title="Delete"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editingTask && (
        <div style={modalStyles.overlay} onClick={cancelEdit}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={modalStyles.title}>Edit Task</h3>
              <button 
                onClick={cancelEdit}
                style={{ background: 'none', border: 'none', color: 'var(--text-color, white)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <CloseOutlined />
              </button>
            </div>

            <label style={modalStyles.label}>Title</label>
            <input
              style={modalStyles.input}
              value={editingTask.title || ""}
              onChange={(e) => handleEditChange("title", e.target.value)}
              placeholder="Task title"
            />

            <label style={modalStyles.label}>Due date & time</label>
            <input
              type="datetime-local"
              style={modalStyles.input}
              value={editingTask.due_date ? localDateTimeForInput(editingTask.due_date) : ""}
              onChange={(e) => handleEditChange("due_date", e.target.value ? e.target.value : null)}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={modalStyles.saveBtn} onClick={submitEdit}>Save</button>
              <button style={modalStyles.cancelBtn} onClick={cancelEdit}>Cancel</button>
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
    fontSize: "0.95rem"
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "0.95rem",
    padding: "10px",
    background: "rgba(255, 107, 107, 0.1)",
    borderRadius: "6px"
  },
  emptyText: {
    color: "var(--text-color, rgba(255,255,255,0.7))",
    fontSize: "0.95rem"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "8px" // allow space for scrollbar
  },
  item: {
    background: "rgba(255,255,255,0.1)",
    border: "2px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    padding: "12px",
    backdropFilter: "blur(5px)"
  },
  itemContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px"
  },
  taskInfo: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "var(--text-color, white)",
    wordBreak: "break-word"
  },
  date: {
    fontSize: "0.8rem",
    color: "var(--text-color, rgba(255,255,255,0.7))",
    marginTop: "4px"
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0
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
    justifyContent: "center"
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
    justifyContent: "center"
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
    justifyContent: "center"
  }
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  modal: {
    background: 'white',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 480,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  title: { margin: 0, marginBottom: 10 },
  label: { fontSize: 12, marginTop: 8, marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' },
  saveBtn: { padding: '8px 12px', background: '#327641', color: 'white', border: 'none', borderRadius: 6 },
  cancelBtn: { padding: '8px 12px', background: '#e0e0e0', border: 'none', borderRadius: 6 }
};
