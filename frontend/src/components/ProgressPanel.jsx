import { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function ProgressPanel() {
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const userId = localStorage.getItem("organote_user_id");
      if (!userId) return;

      const tasks = await apiFetch("/tasks");
      setTotalTasks(tasks.length);
      const completed = tasks.filter((t) => t.status === "completed").length;
      setCompletedTasks(completed);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Progress overview</h3>

      <div style={styles.progressSection}>
        <div style={styles.progressLabel}>
          <span>Progress: {completedTasks}/{totalTasks}</span>
          <span style={styles.progressPercent}>
            {totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%`,
              background: "var(--btn-color, #A7C4A0)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "600",
    color: "var(--text-color, #2A2A2A)",
  },
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  progressLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "var(--text-color, #2A2A2A)",
    fontSize: "0.9rem",
  },
  progressPercent: {
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  progressBar: {
    height: "8px",
    borderRadius: "4px",
    background: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};
