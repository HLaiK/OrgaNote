const express = require("express");
const router = express.Router();
const pool = require("../db/db");

// GET all tasks for a specific user
router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    );
    res.json(result.rows);
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

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// CREATE a new task for a specific user
router.post("/", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { title, description, category, priority, due_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, category, priority, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, category, priority, due_date, userId],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// UPDATE a task (only if it belongs to the user)
router.put("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { title, description, category, priority, due_date, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        title,
        description,
        category,
        priority,
        due_date,
        status,
        req.params.id,
        userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);
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

module.exports = router;
