ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS login_methods text[] DEFAULT ARRAY['password'];
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS registration_mode text DEFAULT 'normal';