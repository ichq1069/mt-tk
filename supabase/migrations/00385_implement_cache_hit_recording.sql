CREATE OR REPLACE FUNCTION record_cache_hit(p_cache_key text, p_is_hit boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_is_hit THEN
    INSERT INTO cache_stats (cache_key, hit_count, miss_count, last_hit_at)
    VALUES (p_cache_key, 1, 0, now())
    ON CONFLICT (cache_key) DO UPDATE
    SET hit_count = cache_stats.hit_count + 1,
        last_hit_at = now();
  ELSE
    INSERT INTO cache_stats (cache_key, hit_count, miss_count, last_miss_at)
    VALUES (p_cache_key, 0, 1, now())
    ON CONFLICT (cache_key) DO UPDATE
    SET miss_count = cache_stats.miss_count + 1,
        last_miss_at = now();
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Ensure cache_key is unique for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cache_stats_cache_key_key'
  ) THEN
    ALTER TABLE cache_stats ADD CONSTRAINT cache_stats_cache_key_key UNIQUE (cache_key);
  END IF;
END;
$$;
