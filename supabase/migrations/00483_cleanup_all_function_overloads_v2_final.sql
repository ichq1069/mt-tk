-- 1. get_random_daily_gallery_images
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(integer, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(integer, uuid[], text[]);

CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(
    p_count integer,
    p_excluded_categories uuid[] DEFAULT '{}',
    p_excluded_tags text[] DEFAULT '{}'
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

-- 2. add_user_exp
DROP FUNCTION IF EXISTS public.add_user_exp(uuid, integer, text, text);
DROP FUNCTION IF EXISTS public.add_user_exp(uuid, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.add_user_exp(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_type text,
    p_target_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET exp = COALESCE(exp, 0) + p_amount
    WHERE id = p_user_id;

    INSERT INTO public.exp_logs (user_id, amount, reason, type, target_id)
    VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id);
END;
$$;

-- 3. add_user_points
DROP FUNCTION IF EXISTS public.add_user_points(uuid, integer, text, text);
DROP FUNCTION IF EXISTS public.add_user_points(uuid, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_type text,
    p_target_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + p_amount
    WHERE id = p_user_id;

    INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
    VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id);
END;
$$;

-- 4. get_filtered_random_media
DROP FUNCTION IF EXISTS public.get_filtered_random_media(integer, uuid);
DROP FUNCTION IF EXISTS public.get_filtered_random_media(integer, text, uuid);

CREATE OR REPLACE FUNCTION public.get_filtered_random_media(
    limit_count integer,
    p_type text DEFAULT 'all',
    p_category_id uuid DEFAULT NULL
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
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (p_type = 'all' OR type = p_type)
      AND (p_category_id IS NULL OR category_id = p_category_id)
    ORDER BY random()
    LIMIT limit_count;
END;
$$;

-- 5. get_recommended_media
DROP FUNCTION IF EXISTS public.get_recommended_media(integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_recommended_media(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_recommended_media(
    p_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    url text,
    thumbnail_url text,
    title text,
    type text,
    favorite_count bigint,
    view_count bigint,
    created_at timestamp with time zone,
    username text,
    avatar_url text,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
BEGIN
    SELECT count(*) INTO v_total FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status AND is_hidden = false AND deleted_at IS NULL;

    RETURN QUERY
    SELECT 
        m.id, m.url, m.thumbnail_url, m.title, m.type, m.favorite_count, m.view_count, m.created_at,
        p.username, p.avatar_url, v_total
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = false AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 6. get_recommended_media_v2
DROP FUNCTION IF EXISTS public.get_recommended_media_v2(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_recommended_media_v2(uuid, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_recommended_media_v2(
    p_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_intensity integer DEFAULT 1
)
RETURNS TABLE (
    id uuid,
    url text,
    thumbnail_url text,
    title text,
    type text,
    favorite_count bigint,
    view_count bigint,
    created_at timestamp with time zone,
    username text,
    avatar_url text,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
BEGIN
    SELECT count(*) INTO v_total FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status AND is_hidden = false AND deleted_at IS NULL;

    RETURN QUERY
    SELECT 
        m.id, m.url, m.thumbnail_url, m.title, m.type, m.favorite_count, m.view_count, m.created_at,
        p.username, p.avatar_url, v_total
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = false AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
