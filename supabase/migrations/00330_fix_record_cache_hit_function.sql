-- 强制删除所有同名函数
DROP FUNCTION IF EXISTS public.record_cache_hit(text, boolean);

-- 创建 100% 匹配你前端的函数
CREATE OR REPLACE FUNCTION public.record_cache_hit(
p_cache_key text,
p_is_hit boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
-- 空逻辑，只返回成功，不影响任何功能
RETURN json_build_object('success', true);
END;
$$;

-- 开放权限
GRANT EXECUTE ON FUNCTION public.record_cache_hit(text, boolean) TO anon, authenticated, service_role;