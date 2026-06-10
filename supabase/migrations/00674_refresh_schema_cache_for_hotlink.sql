-- Refresh schema cache for storage_configs
ALTER TABLE storage_configs ALTER COLUMN hotlink_enabled SET DEFAULT FALSE;
ALTER TABLE storage_configs ALTER COLUMN hotlink_allowed_domains SET DATA TYPE TEXT;
-- Trigger a reload notification if possible
NOTIFY pgrst, 'reload schema';