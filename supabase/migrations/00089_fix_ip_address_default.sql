-- 为 user_visit_stats 表的 ip_address 列设置默认值，自动捕捉请求头中的 IP
ALTER TABLE public.user_visit_stats 
ALTER COLUMN ip_address SET DEFAULT COALESCE(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'cf-connecting-ip',
    'unknown'
);

-- 如果存在历史数据，可以尝试更新（可选）
-- UPDATE public.user_visit_stats SET ip_address = 'unknown' WHERE ip_address IS NULL;
