-- 创建 Web Vitals 性能监控表
CREATE TABLE IF NOT EXISTS public.web_vitals_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_rating TEXT NOT NULL CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
  user_agent TEXT,
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON public.web_vitals_logs(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON public.web_vitals_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_rating ON public.web_vitals_logs(metric_rating);
CREATE INDEX IF NOT EXISTS idx_web_vitals_user_id ON public.web_vitals_logs(user_id);

-- 创建性能统计视图
CREATE OR REPLACE VIEW public.web_vitals_summary AS
SELECT 
  metric_name,
  COUNT(*) as total_count,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as p50_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
  COUNT(CASE WHEN metric_rating = 'good' THEN 1 END) as good_count,
  COUNT(CASE WHEN metric_rating = 'needs-improvement' THEN 1 END) as needs_improvement_count,
  COUNT(CASE WHEN metric_rating = 'poor' THEN 1 END) as poor_count,
  ROUND(COUNT(CASE WHEN metric_rating = 'good' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as good_percentage
FROM public.web_vitals_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY metric_name;

-- 创建获取性能统计的函数
CREATE OR REPLACE FUNCTION public.get_web_vitals_stats(
  p_metric_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  metric_name TEXT,
  total_count BIGINT,
  avg_value NUMERIC,
  p50_value NUMERIC,
  p75_value NUMERIC,
  p95_value NUMERIC,
  good_count BIGINT,
  needs_improvement_count BIGINT,
  poor_count BIGINT,
  good_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wv.metric_name,
    COUNT(*) as total_count,
    AVG(wv.metric_value) as avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wv.metric_value) as p50_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY wv.metric_value) as p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.metric_value) as p95_value,
    COUNT(CASE WHEN wv.metric_rating = 'good' THEN 1 END) as good_count,
    COUNT(CASE WHEN wv.metric_rating = 'needs-improvement' THEN 1 END) as needs_improvement_count,
    COUNT(CASE WHEN wv.metric_rating = 'poor' THEN 1 END) as poor_count,
    ROUND(COUNT(CASE WHEN wv.metric_rating = 'good' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as good_percentage
  FROM public.web_vitals_logs wv
  WHERE wv.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND (p_metric_name IS NULL OR wv.metric_name = p_metric_name)
  GROUP BY wv.metric_name;
END;
$$;

-- 创建清理旧数据的函数（保留最近30天）
CREATE OR REPLACE FUNCTION public.cleanup_old_web_vitals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.web_vitals_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON TABLE public.web_vitals_logs IS 'Web Vitals 性能监控日志表';
COMMENT ON VIEW public.web_vitals_summary IS 'Web Vitals 性能统计摘要视图（最近7天）';
COMMENT ON FUNCTION public.get_web_vitals_stats IS '获取 Web Vitals 性能统计数据';
COMMENT ON FUNCTION public.cleanup_old_web_vitals IS '清理30天前的 Web Vitals 日志';
