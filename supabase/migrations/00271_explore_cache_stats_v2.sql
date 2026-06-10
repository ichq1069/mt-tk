-- 探索页缓存统计表
CREATE TABLE IF NOT EXISTS explore_cache_stats (
    stat_time DATE PRIMARY KEY,
    total_requests INTEGER DEFAULT 0,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    hit_rate DOUBLE PRECISION DEFAULT 0
);

-- 记录缓存命中
CREATE OR REPLACE FUNCTION record_cache_hit(p_cache_key TEXT, p_is_hit BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO explore_cache_stats (stat_time, total_requests, hit_count, miss_count)
  VALUES (CURRENT_DATE, 1, CASE WHEN p_is_hit THEN 1 ELSE 0 END, CASE WHEN p_is_hit THEN 0 ELSE 1 END)
  ON CONFLICT (stat_time) DO UPDATE
  SET total_requests = explore_cache_stats.total_requests + 1,
      hit_count = explore_cache_stats.hit_count + (CASE WHEN p_is_hit THEN 1 ELSE 0 END),
      miss_count = explore_cache_stats.miss_count + (CASE WHEN p_is_hit THEN 0 ELSE 1 END),
      hit_rate = (CAST(explore_cache_stats.hit_count + (CASE WHEN p_is_hit THEN 1 ELSE 0 END) AS FLOAT) / 
                  CAST(explore_cache_stats.total_requests + 1 AS FLOAT)) * 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
