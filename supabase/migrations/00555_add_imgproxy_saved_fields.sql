ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS saved_imgproxy_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS saved_processing_rules jsonb DEFAULT '[]';