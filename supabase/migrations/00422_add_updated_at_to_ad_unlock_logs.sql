ALTER TABLE ad_unlock_logs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update existing records to have updated_at equal to created_at
UPDATE ad_unlock_logs SET updated_at = created_at WHERE updated_at IS NULL;
