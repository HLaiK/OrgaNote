const express = require("express");
const router = express.Router();
const pool = require("../db/db");

let ensureReminderColumnPromise = null;
function ensureReminderColumn() {
  if (!ensureReminderColumnPromise) {
    ensureReminderColumnPromise = pool
      .query(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER",
      )
      .catch((err) => {
        // allow retry on next request if migration fails transiently
        ensureReminderColumnPromise = null;
        throw err;
      });
  }
  return ensureReminderColumnPromise;
}

function normalizePriority(priority) {
  if (priority == null || priority === "") return null;
  if (typeof priority === "number") return priority;

  const value = String(priority).toLowerCase().trim();
  const map = {
    low: 1,
    medium: 2,
    high: 3,
  };

  if (Object.prototype.hasOwnProperty.call(map, value)) {
    return map[value];
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeTask(row) {
  if (!row) return row;
  const map = {
    1: "low",
    2: "medium",
    3: "high",
  };

  const priorityLabel = map[row.priority];
  return {
    ...row,
    priority: priorityLabel || row.priority,
  };
}

// GET all tasks for a specific user
router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    );
    res.json(result.rows.map(serializeTask));
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// GET a single task by ID (only if it belongs to the user)
router.get("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(serializeTask(result.rows[0]));
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// CREATE a new task for a specific user
router.post("/", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const {
    title,
    description,
    category,
    priority,
    due_date,
    status,
    group_id,
    reminder_offset_minutes,
  } = req.body;

  try {
    await ensureReminderColumn();
    const normalizedPriority = normalizePriority(priority);
    const result = await pool.query(
      `INSERT INTO tasks (title, description, category, priority, due_date, reminder_offset_minutes, status, user_id, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'pending'), $8, $9)
       RETURNING *`,
      [
        title,
        description ?? null,
        category ?? null,
        normalizedPriority,
        due_date ?? null,
        due_date ? (reminder_offset_minutes ?? null) : null,
        status ?? null,
        userId,
        group_id ?? null,
      ],
    );

    res.status(201).json(serializeTask(result.rows[0]));
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// UPDATE a task (only if it belongs to the user)
router.put("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const {
    title,
    description,
    category,
    priority,
    due_date,
    status,
    group_id,
    reminder_offset_minutes,
  } = req.body;
  const hasGroupId = Object.prototype.hasOwnProperty.call(req.body, "group_id");
  const hasDueDate = Object.prototype.hasOwnProperty.call(req.body, "due_date");
  const hasReminderOffset = Object.prototype.hasOwnProperty.call(
    req.body,
    "reminder_offset_minutes",
  );

  try {
    await ensureReminderColumn();
    const normalizedPriority = normalizePriority(priority);
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           due_date = CASE WHEN $5 THEN $6 ELSE due_date END,
           status = COALESCE($7, status),
           group_id = CASE WHEN $8 THEN $9 ELSE group_id END,
           reminder_offset_minutes = CASE
             WHEN $5 AND $6 IS NULL THEN NULL
             WHEN $10 THEN $11
             ELSE reminder_offset_minutes
           END,
           updated_at = NOW()
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        title,
        description,
        category,
        normalizedPriority,
        hasDueDate,
        due_date,
        status,
        hasGroupId,
        group_id ?? null,
        hasReminderOffset,
        due_date ? (reminder_offset_minutes ?? null) : null,
        req.params.id,
        userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(serializeTask(result.rows[0]));
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE a task (only if it belongs to the user)
router.delete("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// DELETE all tasks for a specific user
router.delete("/", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    await pool.query("DELETE FROM tasks WHERE user_id = $1", [userId]);
    res.json({ message: "All tasks deleted" });
  } catch (err) {
    console.error("Error deleting all tasks:", err);
    res.status(500).json({ error: "Failed to delete all tasks" });
  }
});

module.exports = router;
