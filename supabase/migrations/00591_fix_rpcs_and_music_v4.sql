-- Step 1: Fix RPC 404 by dropping and recreating with explicit signatures
DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid,text,text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,timestamp with time zone);
DROP FUNCTION IF EXISTS public.log_daily_gallery_access(uuid,text,text,text,text,text,text);

-- Recreate upsert_user_visit_stats
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    p_user_id uuid DEFAULT NULL,
    p_ip_address text DEFAULT NULL,
    p_browser text DEFAULT NULL,
    p_os text DEFAULT NULL,
    p_network_type text DEFAULT NULL,
    p_path text DEFAULT NULL,
    p_duration integer DEFAULT 0,
    p_adblock_enabled boolean DEFAULT false,
    p_device text DEFAULT NULL,
    p_country text DEFAULT NULL,
    p_region text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_referrer text DEFAULT NULL,
    p_resolution text DEFAULT NULL,
    p_language text DEFAULT NULL,
    p_page_title text DEFAULT NULL,
    p_visited_at timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now())
  )
  ON CONFLICT (ip_address, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), path, (created_at::date))
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(public.user_visit_stats.user_id, EXCLUDED.user_id),
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$$;

-- Recreate log_daily_gallery_access
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
SET search_path = public
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
    SELECT NOT EXISTS (
        SELECT 1 FROM public.daily_gallery_access_logs
        WHERE post_id = p_post_id
          AND accessed_at >= CURRENT_DATE
          AND (
            (p_browser_fingerprint IS NOT NULL AND browser_fingerprint = p_browser_fingerprint) OR
            (p_user_id IS NOT NULL AND user_id = p_user_id) OR
            (p_user_openid IS NOT NULL AND user_openid = p_user_openid)
          )
          AND id != (SELECT id FROM public.daily_gallery_access_logs WHERE post_id = p_post_id ORDER BY accessed_at DESC LIMIT 1)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_daily_gallery_access TO anon, authenticated;

-- Step 2: Update background music URL in storage_configs
-- Using a more reliable Pixabay link (without 'download' in path) or other free sources
UPDATE public.storage_configs 
SET bg_music_list = '[{"id":"bgm-01","title":"悠扬钢琴","url":"https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a7315b.mp3"}]'
WHERE id = (SELECT id FROM public.storage_configs LIMIT 1);

-- Step 3: Reload Schema cache
NOTIFY pgrst, 'reload schema';