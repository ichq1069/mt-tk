ALTER TABLE daily_gallery_special_passwords ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'backend';
ALTER TABLE daily_gallery_special_passwords ADD COLUMN IF NOT EXISTS creator_id TEXT;

-- Update existing records to default values
UPDATE daily_gallery_special_passwords SET source = 'backend' WHERE source IS NULL;
