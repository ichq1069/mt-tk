ALTER TABLE public.storage_configs 
ADD COLUMN IF NOT EXISTS smtp_host text,
ADD COLUMN IF NOT EXISTS smtp_port integer,
ADD COLUMN IF NOT EXISTS smtp_user text,
ADD COLUMN IF NOT EXISTS smtp_pass text,
ADD COLUMN IF NOT EXISTS smtp_from text,
ADD COLUMN IF NOT EXISTS smtp_enabled boolean DEFAULT false;
