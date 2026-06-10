CREATE TABLE IF NOT EXISTS proxy_cache_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    original_url text,
    size bigint,
    upload_time timestamptz DEFAULT now(),
    hit_count bigint DEFAULT 0,
    miss_count bigint DEFAULT 0,
    last_accessed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 更新缓存命中的 RPC
CREATE OR REPLACE FUNCTION record_proxy_cache_event(
    p_key text,
    p_is_hit boolean,
    p_original_url text DEFAULT NULL,
    p_size bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO proxy_cache_items (key, original_url, size, hit_count, miss_count, last_accessed_at)
    VALUES (
        p_key, 
        p_original_url, 
        p_size, 
        CASE WHEN p_is_hit THEN 1 ELSE 0 END, 
        CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        now()
    )
    ON CONFLICT (key) DO UPDATE SET
        hit_count = proxy_cache_items.hit_count + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
        miss_count = proxy_cache_items.miss_count + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
        last_accessed_at = now(),
        -- 仅在 original_url 或 size 为空时更新，防止覆盖已有数据
        original_url = COALESCE(proxy_cache_items.original_url, p_original_url),
        size = COALESCE(proxy_cache_items.size, p_size);
END;
$$;
