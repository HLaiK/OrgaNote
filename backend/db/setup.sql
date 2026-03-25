CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP,
  reminder_offset_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  user_id TEXT,
  group_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  sort_by VARCHAR(50) DEFAULT 'priority',
  default_category VARCHAR(50),
  auto_categorize BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_preferences (sort_by, default_category, auto_categorize)
VALUES ('priority', 'personal', true);