ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS enable_progressive_loading BOOLEAN DEFAULT TRUE;
UPDATE storage_configs SET enable_progressive_loading = TRUE WHERE enable_progressive_loading IS NULL;
