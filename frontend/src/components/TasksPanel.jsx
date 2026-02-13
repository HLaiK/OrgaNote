import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await apiFetch("/tasks");
        setTasks(data);
      } catch (err) {
        console.error("Error loading tasks:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (loading) {
    return <div>Loading tasks…</div>;
  }

  if (tasks.length === 0) {
    return <div>No tasks yet. Add some or use the NLP input.</div>;
  }

  return (
    <div>
      <h2 style={styles.header}>Your Tasks</h2>
      <ul style={styles.list}>
        {tasks.map((task) => (
          <li key={task.id} style={styles.item}>
            <div style={styles.title}>{task.title}</div>
            {task.due_date && (
              <div style={styles.date}>
                Due: {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  header: {
    marginBottom: "1rem",
    fontSize: "1.25rem",
    fontWeight: "bold"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  item: {
    padding: "0.75rem",
    borderBottom: "1px solid #eee"
  },
  title: {
    fontSize: "1rem",
    fontWeight: "500"
  },
  date: {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "0.25rem"
  }
};
