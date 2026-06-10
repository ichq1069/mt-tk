-- 修复 record_cache_hit RPC 函数，使用正确的列名
CREATE OR REPLACE FUNCTION record_cache_hit(
  p_cache_key TEXT,
  p_is_hit BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 使用 UPSERT 逻辑更新 cache_stats 表
  INSERT INTO cache_stats (cache_key, hit_count, miss_count, last_hit_at, last_miss_at)
  VALUES (
    p_cache_key,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    CASE WHEN p_is_hit THEN now() ELSE NULL END,
    CASE WHEN p_is_hit THEN NULL ELSE now() END
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    hit_count = cache_stats.hit_count + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    miss_count = cache_stats.miss_count + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    last_hit_at = CASE WHEN p_is_hit THEN now() ELSE cache_stats.last_hit_at END,
    last_miss_at = CASE WHEN NOT p_is_hit THEN now() ELSE cache_stats.last_miss_at END;
END;
$$;