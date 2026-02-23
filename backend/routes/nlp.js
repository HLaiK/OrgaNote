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

function parseRelativeTime(text) {
  // Handle explicit relative time phrases like "in 30 minutes", "in 2 hours", etc.
  const now = new Date();

  // Pattern: "in X minutes/hours/days"
  const inMatch = text.match(/in\s+(\d+)\s+(minute|hour|day)s?/i);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();
    let ms = 0;

    if (unit === "minute") ms = amount * 60 * 1000;
    else if (unit === "hour") ms = amount * 60 * 60 * 1000;
    else if (unit === "day") ms = amount * 24 * 60 * 60 * 1000;

    return new Date(now.getTime() + ms);
  }

  return null;
}

function parseLine(line) {
  const priority = classifyPriority(line);

  // First check for explicit relative time phrases
  let due = parseRelativeTime(line);
  let title = line;

  // If no relative time matched, use chrono for date parsing
  if (!due) {
    const parsed = chrono.parse(line);
    if (parsed.length > 0) {
      // Get the start date which includes time
      due = parsed[0].start.date();

      // Clean title by removing date phrases Chrono recognizes
      parsed.forEach((p) => {
        title = title.replace(p.text, "").trim();
      });
    }
  } else {
    // Remove the relative time phrase from title
    title = title.replace(/in\s+\d+\s+(minute|hour|day)s?/i, "").trim();
  }

  return {
    title: title || line,
    due_date: due ? due.toISOString() : null,
    priority,
  };
}

router.post("/organize", async (req, res) => {
  try {
    const raw_input = req.body.raw_input;
    const userId = req.headers["x-user-id"];

    if (!raw_input) {
      return res.status(400).json({ error: "raw_input is required" });
    }

    const lines = raw_input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedTasks = lines.map(parseLine);

    // Map string priorities → integers
    const priorityMap = {
      low: 1,
      medium: 2,
      high: 3,
    };

    const created = [];

    for (const t of parsedTasks) {
      const priorityValue = priorityMap[t.priority] || 2; // default medium

      const result = await pool.query(
        `INSERT INTO tasks (title, description, category, priority, due_date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [t.title, null, null, priorityValue, t.due_date, userId],
      );

      created.push(result.rows[0]);
    }

    res.json({ created });
  } catch (err) {
    console.error("TEMP NLP ERROR:", err);
    res.status(400).json({ error: "Failed to process NLP input" });
  }
});

module.exports = router;
