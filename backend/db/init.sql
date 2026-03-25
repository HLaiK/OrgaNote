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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER;

CREATE TABLE IF NOT EXISTS task_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4F46E5',
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT tasks_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES task_groups(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

