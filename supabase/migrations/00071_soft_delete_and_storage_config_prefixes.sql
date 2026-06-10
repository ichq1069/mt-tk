-- Add deleted_at column to media_items
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add prefix columns to storage_configs
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS image_path_prefix TEXT DEFAULT 'image';
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS video_path_prefix TEXT DEFAULT 'video';
