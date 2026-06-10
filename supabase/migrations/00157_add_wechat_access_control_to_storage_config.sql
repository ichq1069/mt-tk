ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS wechat_forbidden_mode TEXT DEFAULT 'template',
ADD COLUMN IF NOT EXISTS wechat_forbidden_html TEXT;
