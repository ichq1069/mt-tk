ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS dedupe_version INTEGER DEFAULT 0;
COMMENT ON COLUMN public.media_items.dedupe_version IS '指纹版本，用于排除已处理的相似项';
