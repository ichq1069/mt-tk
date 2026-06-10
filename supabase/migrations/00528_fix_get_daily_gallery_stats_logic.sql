-- 修复 get_daily_gallery_stats RPC 函数
-- 1. 先彻底删除可能存在的不同签名的函数
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats();
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats(date, date);

-- 2. 重新创建返回 TABLE 的函数，符合 DailyGallerySection.tsx 的预期
CREATE OR REPLACE FUNCTION public.get_daily_gallery_stats(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS TABLE(
    post_id uuid, 
    post_date date, 
    image_count integer, 
    view_count integer, 
    unique_visitor_count integer, 
    password text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.post_date,
        cardinality(p.image_ids)::integer as image_count,
        COALESCE(p.view_count, 0)::integer as view_count,
        COALESCE(p.unique_visitor_count, 0)::integer as unique_visitor_count,
        p.password
    FROM public.daily_gallery_posts p
    WHERE (p_start_date IS NULL OR p.post_date >= p_start_date)
      AND (p_end_date IS NULL OR p.post_date <= p_end_date)
    ORDER BY p.post_date DESC;
END;
$$;

-- 3. 授予权限
GRANT EXECUTE ON FUNCTION public.get_daily_gallery_stats(date, date) TO anon, authenticated, service_role;
