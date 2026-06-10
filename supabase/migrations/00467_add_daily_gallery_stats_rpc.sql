-- RPC to get daily gallery stats
CREATE OR REPLACE FUNCTION public.get_daily_gallery_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_views bigint;
    v_visitors bigint;
    v_today_views bigint;
    v_today_visitors bigint;
    v_pwd_usages bigint;
BEGIN
    -- Total views
    SELECT COALESCE(SUM(views_count), 0) INTO v_views FROM public.daily_gallery_posts;
    
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

    RETURN json_build_object(
        'views', v_views,
        'visitors', v_visitors,
        'today_views', v_today_views,
        'today_visitors', v_today_visitors,
        'pwd_usages', v_pwd_usages
    );
END;
$$;
