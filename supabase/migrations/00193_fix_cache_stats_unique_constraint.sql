-- 删除现有的非唯一索引
DROP INDEX IF EXISTS idx_cache_stats_cache_key;

-- 创建唯一索引以支持 ON CONFLICT 子句
CREATE UNIQUE INDEX idx_cache_stats_cache_key_unique ON public.cache_stats(cache_key);

COMMENT ON INDEX idx_cache_stats_cache_key_unique IS '缓存键唯一索引，支持 record_cache_hit 函数的 ON CONFLICT 子句';