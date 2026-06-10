-- Add password_hash column to profiles table to support direct login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create a system config for login strategy if it doesn't exist
INSERT INTO public.system_configs (key, value)
VALUES ('login_strategy_config', '{"strategy": "supabase", "sync_to_auth": true}')
ON CONFLICT (key) DO NOTHING;
