import { useState } from "react";
import { apiFetch } from "../api";

export default function UnstructuredInputPanel({ onTasksCreated }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaId = "unstructured-task-input";
  const helpTextId = "unstructured-task-input-help";

  async function handleOrganize() {
    if (!text.trim()) return;

    setLoading(true);

    try {
      await apiFetch("/nlp/organize", {
        method: "POST",
        body: { raw_input: text, timezone_offset: new Date().getTimezoneOffset() }
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
      <label htmlFor={textareaId} style={styles.label}>Task input</label>
      <textarea
        id={textareaId}
        style={styles.textarea}
        placeholder="Add in your tasks..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby={helpTextId}
      />

      <p id={helpTextId} style={styles.helpText}>
        Paste or type a loose list of tasks and the organizer will turn it into structured tasks.
      </p>

      <button
        style={styles.button}
        onClick={handleOrganize}
        disabled={loading}
        type="button"
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
  label: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-color, white)",
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
  helpText: {
    margin: 0,
    fontSize: "0.8rem",
    lineHeight: 1.4,
    color: "var(--text-color, rgba(255,255,255,0.72))",
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
