CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  raw_input TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority INTEGER,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  ALTER TABLE tasks ADD COLUMN user_id TEXT;
);
