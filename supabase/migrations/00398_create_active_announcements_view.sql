-- 创建一个简化的视图，让前端查询公告更加稳健，避免 PostgREST 的 400 错误
CREATE OR REPLACE VIEW public.active_announcements AS
SELECT 
  id, 
  title, 
  content, 
  type, 
  is_active, 
  start_time, 
  end_time, 
  created_at, 
  updated_at
FROM public.announcements
WHERE is_active = true
AND (end_time IS NULL OR end_time > now());

-- 授权权限给 anon 和 authenticated
GRANT SELECT ON public.active_announcements TO anon, authenticated;
