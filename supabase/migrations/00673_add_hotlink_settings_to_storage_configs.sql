ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS hotlink_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS hotlink_allowed_domains TEXT;