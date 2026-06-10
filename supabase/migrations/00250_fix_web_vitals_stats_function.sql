CREATE OR REPLACE FUNCTION public.get_web_vitals_stats(p_metric_name text DEFAULT NULL::text, p_days integer DEFAULT 7)
 RETURNS TABLE(metric_name text, total_count bigint, avg_value numeric, p50_value numeric, p75_value numeric, p95_value numeric, good_count bigint, needs_improvement_count bigint, poor_count bigint, good_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wv.metric_name,
    COUNT(*)::bigint as total_count,
    AVG(wv.metric_value)::numeric as avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wv.metric_value)::numeric as p50_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY wv.metric_value)::numeric as p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wv.metric_value)::numeric as p95_value,
    COUNT(CASE WHEN wv.metric_rating = 'good' THEN 1 END)::bigint as good_count,
    COUNT(CASE WHEN wv.metric_rating = 'needs-improvement' THEN 1 END)::bigint as needs_improvement_count,
    COUNT(CASE WHEN wv.metric_rating = 'poor' THEN 1 END)::bigint as poor_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0::numeric 
      ELSE ROUND(COUNT(CASE WHEN wv.metric_rating = 'good' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) 
    END as good_percentage
  FROM public.web_vitals_logs wv
  WHERE wv.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND (p_metric_name IS NULL OR wv.metric_name = p_metric_name)
  GROUP BY wv.metric_name;
END;
$function$;
