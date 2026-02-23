import { useState } from "react";
import { apiFetch } from "../api";

export default function UnstructuredInputPanel({ onTasksCreated }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOrganize() {
    if (!text.trim()) return;

    setLoading(true);

    try {
      await apiFetch("/nlp/organize", {
        method: "POST",
        body: { raw_input: text }
      });

      setText("");
      onTasksCreated?.(); // Tell parent to refresh tasks
    } catch (err) {
      console.error("NLP error:", err);
      alert("Failed to organize tasks");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <textarea
        style={styles.textarea}
        placeholder="Add in your tasks..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        style={styles.button}
        onClick={handleOrganize}
        disabled={loading}
      >
        {loading ? "Organizing…" : "Organize"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%"
  },
  textarea: {
    flex: 1,
    padding: "12px",
    fontSize: "0.95rem",
    borderRadius: "8px",
    border: "2px solid rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "var(--text-color, white)",
    resize: "vertical",
    minHeight: "120px",
    fontFamily: "inherit",
    backdropFilter: "blur(5px)"
  },
  button: {
    padding: "12px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "2px solid rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "var(--text-color, white)",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s"
  }
};
