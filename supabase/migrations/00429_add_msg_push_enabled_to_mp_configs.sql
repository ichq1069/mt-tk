-- Add is_msg_push_enabled column to miniprogram_configs
ALTER TABLE public.miniprogram_configs ADD COLUMN IF NOT EXISTS is_msg_push_enabled boolean DEFAULT false;
