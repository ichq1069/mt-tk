ALTER TABLE public.miniprogram_configs 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;
