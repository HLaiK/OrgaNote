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
        body: { raw_input: input }
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
      <div style={styles.content}>
        <h1 style={styles.title}>OrgaNote</h1>
        <p style={styles.subtitle}>Organize your thoughts</p>
        
        <label style={styles.label}>What do you need done?</label>
        <textarea
          style={styles.textarea}
          placeholder="Enter task here"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button
          style={styles.button}
          onClick={handleOrganize}
          disabled={loading}
        >
          {loading ? "Organizing..." : "Organize!"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #a8c686 0%, #9bb87a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  content: {
    textAlign: "center",
    maxWidth: "500px",
    width: "100%"
  },
  title: {
    fontSize: "4rem",
    fontStyle: "italic",
    fontWeight: "300",
    color: "white",
    marginBottom: "0.5rem",
    fontFamily: "'Brush Script MT', cursive",
    letterSpacing: "2px"
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: "2rem",
    fontWeight: "300",
    letterSpacing: "1px"
  },
  label: {
    display: "block",
    fontSize: "0.95rem",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: "1rem",
    fontWeight: "400"
  },
  textarea: {
    width: "100%",
    minHeight: "180px",
    padding: "1.25rem",
    fontSize: "0.95rem",
    borderRadius: "12px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: "1.5rem",
    fontFamily: "inherit",
    resize: "none",
    backdropFilter: "blur(5px)",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  },
  button: {
    padding: "0.85rem 2.5rem",
    fontSize: "1.05rem",
    borderRadius: "8px",
    border: "2px solid rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    letterSpacing: "0.5px",
    transition: "all 0.3s ease",
    backdropFilter: "blur(5px)",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  }
};
