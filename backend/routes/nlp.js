const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const chrono = require("chrono-node");

function classifyPriority(text) {
  const t = text.toLowerCase();

  const highWords = [
    "urgent",
    "asap",
    "immediately",
    "right away",
    "now",
    "today",
    "tonight",
  ];
  const mediumWords = [
    "tomorrow",
    "soon",
    "this week",
    "later today",
    "next few days",
  ];
  const lowWords = ["sometime", "eventually", "maybe", "whenever"];

  let score = 0;

  highWords.forEach((w) => {
    if (t.includes(w)) score += 2;
  });
  mediumWords.forEach((w) => {
    if (t.includes(w)) score += 1;
  });
  lowWords.forEach((w) => {
    if (t.includes(w)) score -= 1;
  });

  if (score >= 2) return "high";
  if (score === 1) return "medium";
  return "low";
}

function parseLine(line) {
  const due = chrono.parseDate(line);
  const priority = classifyPriority(line);

  // Clean title by removing date phrases Chrono recognizes
  let title = line;
  const parsed = chrono.parse(line);
  if (parsed.length > 0) {
    parsed.forEach((p) => {
      title = title.replace(p.text, "").trim();
    });
  }

  return {
    title: title || line,
    due_date: due ? due.toISOString() : null,
    priority,
  };
}

router.post("/organize", async (req, res) => {
  let body = "";

  // Manually read raw body (bypasses broken middleware)
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      // Parse manually
      const parsed = JSON.parse(body);
      const raw_input = parsed.raw_input;
      const userId = req.headers["x-user-id"];

      if (!raw_input) {
        return res.status(400).json({ error: "raw_input is required" });
      }

      const lines = raw_input
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsedTasks = lines.map(parseLine);

      const created = [];

      for (const t of parsedTasks) {
        const result = await pool.query(
          `INSERT INTO tasks (title, description, category, priority, due_date, user_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [t.title, null, null, t.priority, t.due_date, userId],
        );

        created.push(result.rows[0]);
      }

      res.json({ created });
    } catch (err) {
      console.error("TEMP NLP ERROR:", err);
      res.status(400).json({ error: "Invalid JSON received" });
    }
  });
});

module.exports = router;
