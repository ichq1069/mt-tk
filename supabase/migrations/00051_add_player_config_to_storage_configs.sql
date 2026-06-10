ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS player_type TEXT DEFAULT 'h5',
ADD COLUMN IF NOT EXISTS player_settings JSONB DEFAULT '{}'::jsonb;

-- Update the RLS if necessary, usually storage_configs is admin-only for updates
