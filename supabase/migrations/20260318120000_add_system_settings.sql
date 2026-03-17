-- System-wide key-value settings managed via Superadmin UI.
-- Values are stored as JSONB to support numbers, strings, arrays, etc.

CREATE TABLE IF NOT EXISTS system_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed defaults
INSERT INTO system_settings (key, value, description) VALUES
  ('max_photos_per_property', '30', '每個物件最多可上傳的照片張數')
ON CONFLICT (key) DO NOTHING;
