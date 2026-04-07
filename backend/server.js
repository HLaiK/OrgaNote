const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: "application/json", limit: "50mb" }));

// API routes
const taskRoutes = require("./routes/tasks");
app.use("/api/tasks", taskRoutes);

const taskGroupRoutes = require("./routes/taskGroups");
app.use("/api/task-groups", taskGroupRoutes);

const nlpRoutes = require("./routes/nlp");
app.use("/api/nlp", nlpRoutes);

const pool = require("./db/db");

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        raw_input TEXT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority INTEGER,
        due_date TIMESTAMPTZ,
        reminder_offset_minutes INTEGER,
        status TEXT DEFAULT 'pending',
        user_id TEXT,
        group_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS raw_input TEXT",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority INTEGER",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'",
    );
    await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT");
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id INTEGER",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    );
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#4F46E5',
        user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool
      .query(
        `ALTER TABLE tasks
       ADD CONSTRAINT tasks_group_id_fkey
       FOREIGN KEY (group_id)
       REFERENCES task_groups(id)
       ON DELETE SET NULL`,
      )
      .catch(() => {});
  } catch (err) {
    console.error("Schema ensure error:", err);
    throw err;
  }
}

async function startServer() {
  await ensureSchema();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
