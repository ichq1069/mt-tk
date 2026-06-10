ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS image_processing_url TEXT,
ADD COLUMN IF NOT EXISTS image_processing_rules JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enable_proxy_image_processing BOOLEAN DEFAULT FALSE;
