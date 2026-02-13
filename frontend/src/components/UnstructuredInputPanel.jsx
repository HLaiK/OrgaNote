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
    gap: "10px",
    height: "100%"
  },
  textarea: {
    flex: 1,
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    resize: "none"
  },
  button: {
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "rgba(255,255,255,.5)",
    color: "white",
    cursor: "pointer"
  }
};
