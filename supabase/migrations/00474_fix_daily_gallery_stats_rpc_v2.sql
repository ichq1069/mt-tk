-- Drop the existing function first to change return type or just fix it with the same return type
-- We need to specify the argument types for DROP FUNCTION since it's overloaded
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats();

CREATE OR REPLACE FUNCTION public.get_daily_gallery_stats()
RETURNS jsonb -- Using jsonb as it's generally preferred
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_views bigint;
    v_visitors bigint;
    v_today_views bigint;
    v_today_visitors bigint;
    v_pwd_usages bigint;
BEGIN
    -- Total views - corrected column name from views_count to view_count
    SELECT COALESCE(SUM(view_count), 0) INTO v_views FROM public.daily_gallery_posts;
    
    -- Total unique visitors (from access logs)
    SELECT COUNT(DISTINCT browser_id) INTO v_visitors FROM public.daily_gallery_access_logs;
    
    -- Today's views
    SELECT COUNT(*) INTO v_today_views FROM public.daily_gallery_access_logs 
    WHERE created_at >= CURRENT_DATE;
    
    -- Today's visitors
    SELECT COUNT(DISTINCT browser_id) INTO v_today_visitors FROM public.daily_gallery_access_logs 
    WHERE created_at >= CURRENT_DATE;

    -- Password usages
    SELECT COALESCE(SUM(used_count), 0) INTO v_pwd_usages FROM public.daily_gallery_special_passwords;

    RETURN jsonb_build_object(
        'views', v_views,
        'visitors', v_visitors,
        'today_views', v_today_views,
        'today_visitors', v_today_visitors,
        'pwd_usages', v_pwd_usages
    );
END;
$$;
