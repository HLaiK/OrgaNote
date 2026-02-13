import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTasks() {
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
    }

    loadTasks();
  }, []);

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { completed: !currentStatus }
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
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
    <ul style={styles.list}>
      {tasks.map((task) => (
        <li key={task.id} style={styles.item}>
          <div style={styles.itemContent}>
            <div style={styles.taskInfo}>
              <div style={styles.title}>{task.title}</div>
              {task.due_date && (
                <div style={styles.date}>
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
            <div style={styles.actions}>
              <button
                style={styles.checkButton}
                onClick={() => handleToggleComplete(task.id, task.completed)}
                title="Mark complete"
              >
                ✓
              </button>
              <button
                style={styles.deleteButton}
                onClick={() => handleDelete(task.id)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const styles = {
  loadingText: {
    color: "rgba(255,255,255,0.7)",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: "0.95rem"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px"
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
    color: "white",
    wordBreak: "break-word"
  },
  date: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.7)",
    marginTop: "4px"
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0
  },
  checkButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "rgba(255,255,255,0.8)",
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
    color: "rgba(255,255,255,0.8)",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};
