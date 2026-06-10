ALTER TABLE public.storage_configs 
ADD COLUMN IF NOT EXISTS enable_thumbnails BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_upload_categories BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_upload_tags BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS default_upload_category TEXT,
ADD COLUMN IF NOT EXISTS default_upload_tags TEXT,
ADD COLUMN IF NOT EXISTS file_naming_rule TEXT,
ADD COLUMN IF NOT EXISTS file_naming_rule_sample TEXT;