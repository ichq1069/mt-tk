-- 1. 增加媒体安全配置
INSERT INTO public.system_configs (key, value)
VALUES ('media_security_config', '{
  "mode": "blob",
  "slice_count": 4,
  "signed_expiry": 300,
  "enable_webp": true,
  "prefetch_count": 5
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. 确保缓存记录表存在
CREATE TABLE IF NOT EXISTS public.media_cache_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL,
    hit_count BIGINT DEFAULT 0,
    miss_count BIGINT DEFAULT 0,
    recorded_at DATE DEFAULT CURRENT_DATE,
    UNIQUE(cache_key, recorded_at)
);

-- 3. 创建记录缓存命中的 RPC
CREATE OR REPLACE FUNCTION public.record_cache_hit(p_cache_key TEXT, p_is_hit BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.media_cache_stats (cache_key, hit_count, miss_count)
    VALUES (p_cache_key, CASE WHEN p_is_hit THEN 1 ELSE 0 END, CASE WHEN p_is_hit THEN 0 ELSE 1 END)
    ON CONFLICT (cache_key, recorded_at)
    DO UPDATE SET 
        hit_count = media_cache_stats.hit_count + EXCLUDED.hit_count,
        miss_count = media_cache_stats.miss_count + EXCLUDED.miss_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
