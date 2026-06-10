ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS upload_category_single BOOLEAN DEFAULT TRUE;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS thumbnail_quality INTEGER DEFAULT 80;