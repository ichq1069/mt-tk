-- Create archive tables
CREATE TABLE IF NOT EXISTS public.daily_gallery_posts_archive (LIKE public.daily_gallery_posts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.ad_unlock_logs_archive (LIKE public.ad_unlock_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.daily_gallery_access_logs_archive (LIKE public.daily_gallery_access_logs INCLUDING ALL);

-- Add performance indexes to main tables
CREATE INDEX IF NOT EXISTS idx_daily_gallery_posts_post_date ON public.daily_gallery_posts (post_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_posts_is_published ON public.daily_gallery_posts (is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_ad_unlock_logs_item_id ON public.ad_unlock_logs (item_id);
CREATE INDEX IF NOT EXISTS idx_ad_unlock_logs_created_at ON public.ad_unlock_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_unlock_logs_user_lookup ON public.ad_unlock_logs (openid, user_id, browser_id);

CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_publish_date ON public.daily_gallery_access_logs (publish_date);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_accessed_at ON public.daily_gallery_access_logs (accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_user_lookup ON public.daily_gallery_access_logs (openid, user_id, browser_fingerprint);

-- Add read history helper view for users (optional, but good for performance)
CREATE OR REPLACE VIEW public.user_daily_read_history AS
SELECT DISTINCT ON (COALESCE(openid, user_id::text, browser_fingerprint), publish_date)
    COALESCE(openid, user_id::text, browser_fingerprint) as user_identifier,
    publish_date,
    accessed_at
FROM public.daily_gallery_access_logs
WHERE access_type = 'view'
ORDER BY user_identifier, publish_date, accessed_at DESC;
