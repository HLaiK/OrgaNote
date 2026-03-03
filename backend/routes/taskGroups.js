const express = require("express");
const router = express.Router();
const pool = require("../db/db");

router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    const result = await pool.query(
      `SELECT id, name, color, created_at, updated_at
       FROM task_groups
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching task groups:", err);
    res.status(500).json({ error: "Failed to fetch task groups" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO task_groups (name, color, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, created_at, updated_at`,
      [name.trim(), color || "#4F46E5", userId],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating task group:", err);
    res.status(500).json({ error: "Failed to create task group" });
  }
});

router.put("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { name, color } = req.body;

  try {
    const result = await pool.query(
      `UPDATE task_groups
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, color, created_at, updated_at`,
      [name ? name.trim() : null, color || null, req.params.id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task group not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating task group:", err);
    res.status(500).json({ error: "Failed to update task group" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];

  try {
    await pool.query(
      `UPDATE tasks
       SET group_id = NULL, updated_at = NOW()
       WHERE group_id = $1 AND user_id = $2`,
      [req.params.id, userId],
    );

    const result = await pool.query(
      "DELETE FROM task_groups WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task group not found" });
    }

    res.json({ message: "Task group deleted" });
  } catch (err) {
    console.error("Error deleting task group:", err);
    res.status(500).json({ error: "Failed to delete task group" });
  }
});

module.exports = router;