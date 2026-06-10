-- 1. Cleanup get_daily_gallery_stats
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats();
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats(date, date);

CREATE OR REPLACE FUNCTION public.get_daily_gallery_stats(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_posts bigint;
    v_total_images bigint;
    v_total_views bigint;
    v_total_favorites bigint;
    v_avg_images_per_post numeric;
    v_result jsonb;
BEGIN
    SELECT count(*), COALESCE(sum(jsonb_array_length(image_ids::jsonb)), 0), COALESCE(sum(view_count), 0), COALESCE(sum(favorite_count), 0)
    INTO v_total_posts, v_total_images, v_total_views, v_total_favorites
    FROM public.daily_gallery_posts
    WHERE (p_start_date IS NULL OR post_date >= p_start_date)
      AND (p_end_date IS NULL OR post_date <= p_end_date);

    IF v_total_posts > 0 THEN
        v_avg_images_per_post := round(v_total_images::numeric / v_total_posts, 2);
    ELSE
        v_avg_images_per_post := 0;
    END IF;

    v_result := jsonb_build_object(
        'total_posts', v_total_posts,
        'total_images', v_total_images,
        'total_views', v_total_views,
        'total_favorites', v_total_favorites,
        'avg_images_per_post', v_avg_images_per_post
    );

    RETURN v_result;
END;
$$;

-- 2. Cleanup verify_daily_gallery_password
DROP FUNCTION IF EXISTS public.verify_daily_gallery_password(text, text, text, text);
DROP FUNCTION IF EXISTS public.verify_daily_gallery_password(date, text, text, text);

CREATE OR REPLACE FUNCTION public.verify_daily_gallery_password(
    p_post_date date,
    p_password text,
    p_openid text DEFAULT NULL,
    p_browser_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_id uuid;
    v_correct_password text;
    v_is_special boolean := false;
    v_special_id uuid;
BEGIN
    -- Check if it is a normal post password
    SELECT id, password INTO v_post_id, v_correct_password
    FROM public.daily_gallery_posts
    WHERE post_date = p_post_date;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期没有发布内容');
    END IF;

    -- 1. Check special/one-time passwords
    SELECT id INTO v_special_id
    FROM public.daily_gallery_special_passwords
    WHERE password = p_password
      AND (target_date IS NULL OR target_date = p_post_date)
      AND (expires_at IS NULL OR expires_at > now())
      AND (is_one_time = false OR (is_one_time = true AND usages < max_usages))
    LIMIT 1;

    IF v_special_id IS NOT NULL THEN
        -- Mark as used
        UPDATE public.daily_gallery_special_passwords
        SET usages = usages + 1, last_used_at = now()
        WHERE id = v_special_id;
        
        RETURN jsonb_build_object('success', true, 'message', '特权密码验证成功', 'post_id', v_post_id);
    END IF;

    -- 2. Check normal password
    IF v_correct_password = p_password THEN
        RETURN jsonb_build_object('success', true, 'message', '验证成功', 'post_id', v_post_id);
    END IF;

    RETURN jsonb_build_object('success', false, 'message', '密码错误');
END;
$$;

-- 3. Cleanup log_daily_gallery_access
DROP FUNCTION IF EXISTS public.log_daily_gallery_access(uuid, text, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.log_daily_gallery_access(uuid, text, uuid, text, text, text, text);

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
BEGIN
    INSERT INTO public.daily_gallery_access_logs (
        post_id, user_openid, user_id, ip_address, user_agent, password_used, browser_fingerprint
    )
    VALUES (
        p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used, p_browser_fingerprint
    );

    -- Increment view count
    UPDATE public.daily_gallery_posts
    SET view_count = view_count + 1
    WHERE id = p_post_id;
END;
$$;

-- 4. Cleanup auto_refill functions
DROP FUNCTION IF EXISTS public.auto_refill_pending_daily_gallery_materials();
-- auto_refill_pending_daily_gallery_images already exists and is correct, but let's ensure it's defined once

-- 5. Cleanup get_random_daily_gallery_images
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(integer);
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(integer, uuid[], text[]);

CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(
    p_count integer,
    p_excluded_categories uuid[] DEFAULT '{}',
    p_excluded_tags text[] DEFAULT '{}' -- Corrected type from uuid[] to text[] as tags are text[]
)
RETURNS SETOF public.media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND type = 'image'
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
      AND (p_excluded_categories = '{}' OR category_id IS NULL OR NOT (category_id = ANY(p_excluded_categories)))
      AND (p_excluded_tags = '{}' OR NOT (tags && p_excluded_tags))
    ORDER BY random()
    LIMIT p_count;
END;
$$;

-- 6. Cleanup get_random_daily_gallery_images_v2
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images_v2(integer, integer, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images_v2(integer, integer);

-- If v2 is not needed, we can just leave it dropped. get_random_daily_gallery_images should be enough.
-- But if the frontend uses it, we should recreate it. Let's check.
