-- Ensure columns exist
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS hotlink_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS hotlink_allowed_domains TEXT;

-- Trigger schema reload by modifying a comment with static string
COMMENT ON TABLE storage_configs IS 'Storage configurations updated';

-- Force reload notification
NOTIFY pgrst, 'reload schema';