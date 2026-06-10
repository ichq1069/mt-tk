-- 1. 优化 log_daily_gallery_access RPC 函数以精确跟踪 UV
CREATE OR REPLACE FUNCTION public.log_daily_gallery_access(
    p_post_id uuid,
    p_user_openid text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_password_used text DEFAULT NULL,
    p_browser_fingerprint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_new_visitor boolean;
BEGIN
    -- 插入访问日志
    INSERT INTO public.daily_gallery_access_logs (
        post_id, user_openid, user_id, ip_address, user_agent, password_used, browser_fingerprint
    )
    VALUES (
        p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used, p_browser_fingerprint
    );

    -- 检查是否为该帖子的新访客 (在今天之内)
    -- 注意：这里简单定义为“只要以前没访问过这个 post”即为新访客，或者可以定义为“今天内第一次访问”
    -- 根据用户需求“优化独立访客访问统计”，我们通常指总独立访客数
    SELECT NOT EXISTS (
        SELECT 1 FROM public.daily_gallery_access_logs
        WHERE post_id = p_post_id
          AND id != LASTVAL() -- 排除刚刚插入的这条
          AND (
            (p_browser_fingerprint IS NOT NULL AND browser_fingerprint = p_browser_fingerprint) OR
            (p_user_id IS NOT NULL AND user_id = p_user_id) OR
            (p_user_openid IS NOT NULL AND user_openid = p_user_openid)
          )
    ) INTO v_is_new_visitor;

    -- 更新 PV
    UPDATE public.daily_gallery_posts
    SET view_count = view_count + 1
    WHERE id = p_post_id;

    -- 如果是新访客，更新 UV
    IF v_is_new_visitor THEN
        UPDATE public.daily_gallery_posts
        SET unique_visitor_count = unique_visitor_count + 1
        WHERE id = p_post_id;
    END IF;
END;
$$;

-- 2. 补偿更新现有的 unique_visitor_count (一次性)
UPDATE public.daily_gallery_posts p
SET unique_visitor_count = (
    SELECT count(distinct coalesce(browser_fingerprint, user_openid, user_id::text, ip_address)) 
    FROM public.daily_gallery_access_logs 
    WHERE post_id = p.id
);
