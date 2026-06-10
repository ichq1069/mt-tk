-- 为 system_configs 增加或确保配置项存在
INSERT INTO system_configs (key, value)
VALUES 
  ('media_blob_config', '{"enabled": false}'::jsonb),
  ('explorer_cache_config', '{"enabled": false, "hit_count": 0, "miss_count": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 统计函数
CREATE OR REPLACE FUNCTION increment_cache_stat(p_stat_type text)
RETURNS void AS $$
BEGIN
  IF p_stat_type = 'hit' THEN
    UPDATE system_configs 
    SET value = value || jsonb_build_object('hit_count', (value->>'hit_count')::int + 1)
    WHERE key = 'explorer_cache_config';
  ELSIF p_stat_type = 'miss' THEN
    UPDATE system_configs 
    SET value = value || jsonb_build_object('miss_count', (value->>'miss_count')::int + 1)
    WHERE key = 'explorer_cache_config';
  END IF;
END;
$$ LANGUAGE plpgsql;
