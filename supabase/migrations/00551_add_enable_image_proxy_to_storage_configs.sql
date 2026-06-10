ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS enable_image_proxy boolean DEFAULT false;
UPDATE storage_configs SET enable_image_proxy = true WHERE image_proxy_url IS NOT NULL AND image_proxy_url != '';
