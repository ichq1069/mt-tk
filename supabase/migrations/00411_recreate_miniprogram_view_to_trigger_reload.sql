-- 重新创建视图以触发 PostgREST 缓存刷新
DROP VIEW IF EXISTS public_miniprogram_configs;

CREATE VIEW public_miniprogram_configs AS
SELECT 
    id,
    task_page_path,
    login_page_path,
    is_mp_login_enabled,
    is_mp_bind_enabled,
    is_debug_enabled
FROM miniprogram_configs;

GRANT SELECT ON public_miniprogram_configs TO anon, authenticated;
