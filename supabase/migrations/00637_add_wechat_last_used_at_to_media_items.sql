ALTER TABLE media_items ADD COLUMN IF NOT EXISTS wechat_last_used_at TIMESTAMP WITH TIME ZONE;
-- Update existing records if possible, though not strictly necessary for new selection logic
UPDATE media_items 
SET wechat_last_used_at = created_at 
WHERE wechat_draft_status IN ('used', 'adopted') AND wechat_last_used_at IS NULL;
