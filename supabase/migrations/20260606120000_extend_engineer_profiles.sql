-- Extend engineer_profiles with additional scheduling metadata.

ALTER TABLE engineer_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks INT NOT NULL DEFAULT 2;

