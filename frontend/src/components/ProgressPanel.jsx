import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import PlantRewardPanel from "./PlantRewardPanel";

export default function ProgressPanel({ refreshTrigger = 0 }) {
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  const loadTasks = async () => {
    try {
      const userId = localStorage.getItem("organote_user_id");
      if (!userId) return;

      const tasks = await apiFetch("/tasks");
      setTasks(Array.isArray(tasks) ? tasks : []);
      setTotalTasks(tasks.length);
      const completed = tasks.filter((task) => task.status === "completed" || task.status === true).length;
      setCompletedTasks(completed);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const remainingTasks = Math.max(totalTasks - completedTasks, 0);
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Progress overview</h3>

      <PlantRewardPanel completedTasks={completedTasks} totalTasks={totalTasks} tasks={tasks} />

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Completed</span>
          <strong style={styles.statValue}>{completedTasks}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Left total</span>
          <strong style={styles.statValue}>{remainingTasks}</strong>
        </div>
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressLabel}>
          <span>Overall progress: {completedTasks}/{totalTasks}</span>
          <span style={styles.progressPercent}>
            {progressPercent}%
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%`,
              background: "linear-gradient(90deg, var(--btn-color, #A7C4A0), #6FA060)",
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
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.45)",
    border: "1px solid rgba(255,255,255,0.35)",
  },
  statLabel: {
    color: "rgba(42,42,42,0.62)",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    color: "var(--text-color, #2A2A2A)",
    fontSize: "1rem",
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
    height: "10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};
