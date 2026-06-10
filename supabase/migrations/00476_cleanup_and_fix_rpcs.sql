-- Drop existing functions to avoid overloading/signature issues
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE proname = 'upsert_user_visit_stats' AND pg_namespace.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ')';
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer);
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer, text);

-- Recreate upsert_user_visit_stats with correct signature
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    user_id uuid,
    ip_address text,
    browser text,
    os text,
    network_type text,
    path text,
    duration integer,
    adblock_enabled boolean,
    device text,
    country text,
    region text,
    city text,
    referrer text,
    resolution text,
    language text,
    page_title text,
    visited_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    user_id,
    ip_address,
    browser,
    os,
    network_type,
    path,
    duration,
    adblock_enabled,
    device,
    country,
    region,
    city,
    referrer,
    resolution,
    language,
    page_title,
    visited_at
  );
END;
$$;

-- Recreate get_used_daily_gallery_images with a single consistent signature
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    used_at timestamp with time zone,
    post_date date,
    has_record boolean,
    daily_gallery_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    COALESCE(p.created_at, m.created_at) as used_at, 
    COALESCE(m.daily_gallery_date, p.post_date) as post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  ORDER BY COALESCE(m.daily_gallery_date, p.post_date) DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create missing get_daily_gallery_available_images_rpc if it was somehow broken
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(
    p_status text,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    status text,
    daily_gallery_status text,
    created_at timestamp with time zone,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_excluded_cats uuid[];
    v_excluded_tags text[];
    v_total bigint;
BEGIN
    -- 从系统配置中获取排除设置
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- 先计算总数
    SELECT count(*) INTO v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags));

    RETURN QUERY
    SELECT 
        m.id, 
        m.url, 
        m.title, 
        m.description, 
        m.status::text, 
        COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
        m.created_at,
        v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags))
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
