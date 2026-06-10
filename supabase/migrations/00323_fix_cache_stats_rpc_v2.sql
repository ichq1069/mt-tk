-- 修正 record_cache_hit RPC 函数，适配前端已有的调用参数 p_is_hit
CREATE OR REPLACE FUNCTION record_cache_hit(p_cache_key TEXT, p_is_hit BOOLEAN DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cache_stats (stat_date, total_requests, hit_count, miss_count)
  VALUES (
    CURRENT_DATE,
    1,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    total_requests = cache_stats.total_requests + 1,
    hit_count = cache_stats.hit_count + (CASE WHEN p_is_hit THEN 1 ELSE 0 END),
    miss_count = cache_stats.miss_count + (CASE WHEN p_is_hit THEN 0 ELSE 1 END),
    updated_at = NOW();
END;
$$;
