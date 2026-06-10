ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS enable_blob BOOLEAN DEFAULT TRUE;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS enable_image_cache BOOLEAN DEFAULT FALSE;

-- 确保 cache_stats 表存在
CREATE TABLE IF NOT EXISTS cache_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    last_miss_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建记录缓存命中情况的 RPC
CREATE OR REPLACE FUNCTION record_cache_hit(p_cache_key TEXT, p_is_hit BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF p_is_hit THEN
        INSERT INTO cache_stats (cache_key, hit_count, last_hit_at)
        VALUES (p_cache_key, 1, NOW())
        ON CONFLICT (cache_key)
        DO UPDATE SET 
            hit_count = cache_stats.hit_count + 1,
            last_hit_at = NOW();
    ELSE
        INSERT INTO cache_stats (cache_key, miss_count, last_miss_at)
        VALUES (p_cache_key, 1, NOW())
        ON CONFLICT (cache_key)
        DO UPDATE SET 
            miss_count = cache_stats.miss_count + 1,
            last_miss_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 允许匿名调用记录（如果需要前端直接记录）
GRANT EXECUTE ON FUNCTION record_cache_hit(TEXT, BOOLEAN) TO anon, authenticated;
