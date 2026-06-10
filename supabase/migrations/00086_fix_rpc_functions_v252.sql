-- Fix get_random_media_items
CREATE OR REPLACE FUNCTION public.get_random_media_items(p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, url text, thumbnail_url text, type text, category_id uuid, user_id uuid, view_count bigint, favorite_count bigint, created_at timestamp with time zone, status text, deleted_at timestamp with time zone, username text, avatar_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        m.id::uuid, 
        m.title::text, 
        m.url::text, 
        m.thumbnail_url::text, 
        m.type::text, 
        m.category_id::uuid, 
        m.user_id::uuid, 
        COALESCE(m.view_count, 0)::bigint, 
        COALESCE(m.favorite_count, 0)::bigint, 
        m.created_at::timestamptz, 
        m.status::text, 
        m.deleted_at::timestamptz,
        p.username::text, 
        p.avatar_url::text
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$function$;

-- Fix get_recommended_media
CREATE OR REPLACE FUNCTION public.get_recommended_media(p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, url text, thumbnail_url text, type text, category_id uuid, user_id uuid, view_count bigint, favorite_count bigint, created_at timestamp with time zone, status text, deleted_at timestamp with time zone, username text, avatar_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        m.id::uuid, 
        m.title::text, 
        m.url::text, 
        m.thumbnail_url::text, 
        m.type::text, 
        m.category_id::uuid, 
        m.user_id::uuid, 
        COALESCE(m.view_count, 0)::bigint, 
        COALESCE(m.favorite_count, 0)::bigint, 
        m.created_at::timestamptz, 
        m.status::text, 
        m.deleted_at::timestamptz,
        p.username::text, 
        p.avatar_url::text
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
    ORDER BY (COALESCE(m.favorite_count, 0) * 5 + COALESCE(m.view_count, 0)) DESC, m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;
