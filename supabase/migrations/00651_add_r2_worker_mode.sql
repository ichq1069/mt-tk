ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS r2_mode text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS r2_worker_url text,
ADD COLUMN IF NOT EXISTS r2_worker_token text;

-- Update existing config if any
UPDATE storage_configs SET r2_mode = 'direct' WHERE r2_mode IS NULL;
