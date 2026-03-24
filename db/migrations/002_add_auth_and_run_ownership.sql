ALTER TABLE runs ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS runs_user_id_run_date_created_at_idx
  ON runs (user_id, run_date DESC, created_at DESC);
