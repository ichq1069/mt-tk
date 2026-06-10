CREATE TABLE IF NOT EXISTS superbed_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superbed_id TEXT,
  superbed_token TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  is_upload_page_enabled BOOLEAN DEFAULT FALSE,
  allowed_groups TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure there is only one row for configuration
CREATE UNIQUE INDEX IF NOT EXISTS superbed_configs_single_row ON superbed_configs ((id IS NOT NULL));

-- Insert a default config row if not exists
INSERT INTO superbed_configs (superbed_id, superbed_token, is_enabled, is_upload_page_enabled, allowed_groups)
VALUES ('', '', FALSE, FALSE, '{}')
ON CONFLICT DO NOTHING;
