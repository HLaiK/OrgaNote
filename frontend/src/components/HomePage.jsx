import { useState } from "react";
import { apiFetch } from "../api";

export default function HomePage({ onFinish }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrganize = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      // Send raw text to your NLP route 
      await apiFetch("/nlp/organize", {
        method: "POST",
        body: JSON.stringify({ raw_input: input })
      });

      // Mark user as having completed intro
      onFinish();
    } catch (err) {
      console.error("NLP error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to OrgaNote</h1>

      <textarea
        style={styles.textarea}
        placeholder="Paste your tasks here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        style={styles.button}
        onClick={handleOrganize}
        disabled={loading}
      >
        {loading ? "Organizing..." : "Organize"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "2rem",
    textAlign: "center"
  },
  title: {
    marginBottom: "1.5rem"
  },
  textarea: {
    width: "100%",
    height: "200px",
    padding: "1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "1rem"
  },
  button: {
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4f46e5",
    color: "white",
    cursor: "pointer"
  }
};
