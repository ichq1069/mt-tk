-- 创建缓存配置表
CREATE TABLE IF NOT EXISTS public.cache_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  ttl_seconds INTEGER NOT NULL DEFAULT 300,
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认缓存配置
INSERT INTO public.cache_config (cache_key, ttl_seconds, description) VALUES
  ('popular_media', 300, '热门内容缓存，5分钟'),
  ('recommended_media', 180, '推荐内容缓存，3分钟'),
  ('tag_cloud', 600, '标签云缓存，10分钟'),
  ('user_profile', 120, '用户资料缓存，2分钟')
ON CONFLICT (cache_key) DO NOTHING;

-- 创建缓存统计表
CREATE TABLE IF NOT EXISTS public.cache_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  last_miss_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建缓存命中率统计函数
CREATE OR REPLACE FUNCTION public.get_cache_hit_rate(p_cache_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats RECORD;
  v_hit_rate NUMERIC;
BEGIN
  SELECT 
    hit_count,
    miss_count,
    CASE 
      WHEN (hit_count + miss_count) > 0 
      THEN ROUND((hit_count::NUMERIC / (hit_count + miss_count)) * 100, 2)
      ELSE 0
    END as hit_rate
  INTO v_stats
  FROM public.cache_stats
  WHERE cache_key = p_cache_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'cache_key', p_cache_key,
      'hit_count', 0,
      'miss_count', 0,
      'hit_rate', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'cache_key', p_cache_key,
    'hit_count', v_stats.hit_count,
    'miss_count', v_stats.miss_count,
    'hit_rate', v_stats.hit_rate
  );
END;
$$;

-- 创建记录缓存命中的函数
CREATE OR REPLACE FUNCTION public.record_cache_hit(p_cache_key TEXT, p_is_hit BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cache_stats (cache_key, hit_count, miss_count, last_hit_at, last_miss_at)
  VALUES (
    p_cache_key,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    CASE WHEN p_is_hit THEN NOW() ELSE NULL END,
    CASE WHEN p_is_hit THEN NULL ELSE NOW() END
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    hit_count = cache_stats.hit_count + CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    miss_count = cache_stats.miss_count + CASE WHEN p_is_hit THEN 0 ELSE 1 END,
    last_hit_at = CASE WHEN p_is_hit THEN NOW() ELSE cache_stats.last_hit_at END,
    last_miss_at = CASE WHEN p_is_hit THEN cache_stats.last_miss_at ELSE NOW() END;
END;
$$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cache_stats_cache_key ON public.cache_stats(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_config_cache_key ON public.cache_config(cache_key);

COMMENT ON TABLE public.cache_config IS '缓存配置表，存储各类缓存的TTL和启用状态';
COMMENT ON TABLE public.cache_stats IS '缓存统计表，记录缓存命中率';
COMMENT ON FUNCTION public.get_cache_hit_rate IS '获取指定缓存键的命中率统计';
COMMENT ON FUNCTION public.record_cache_hit IS '记录缓存命中或未命中事件';
