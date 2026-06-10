ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS is_maintenance_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS maintenance_allowed_paths TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS maintenance_message TEXT;