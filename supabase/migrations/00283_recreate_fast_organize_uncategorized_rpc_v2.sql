DROP FUNCTION IF EXISTS public.get_fast_organize_uncategorized(uuid,text,integer,integer);

CREATE OR REPLACE FUNCTION public.get_fast_organize_uncategorized(
    p_user_id uuid,
    p_type text,
    p_limit integer,
    p_offset integer
)
RETURNS TABLE (
    id uuid,
    title text,
    url text,
    type text,
    category_id uuid,
    user_id uuid,
    created_at timestamp with time zone,
    username text,
    avatar_url text,
    source_table text
) AS $$
DECLARE
    v_unclassifiable_category_id UUID;
BEGIN
    -- 获取"无法分类"分类的 ID
    SELECT cc.id INTO v_unclassifiable_category_id
    FROM public.content_categories cc
    WHERE cc.name = '无法分类'
    LIMIT 1;

    RETURN QUERY
    (
        SELECT 
            m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
            p.username, p.avatar_url, 'media_items'::text as source_table
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        WHERE m.category_id IS NULL 
          AND m.deleted_at IS NULL
          AND (p_type = 'all' OR m.type = p_type)
          AND NOT EXISTS (
              SELECT 1 FROM public.user_pending_items upi 
              WHERE upi.media_id = m.id AND upi.user_id = p_user_id
          )
          AND (v_unclassifiable_category_id IS NULL OR m.id NOT IN (
              SELECT mi.id FROM public.media_items mi WHERE mi.category_id = v_unclassifiable_category_id
          ))
    )
    UNION ALL
    (
        SELECT 
            s.id, s.title, s.url, s.type, s.category_id, s.owner_id as user_id, s.created_at,
            p.username, p.avatar_url, 'media_staging'::text as source_table
        FROM public.media_staging s
        LEFT JOIN public.profiles p ON s.owner_id = p.id
        WHERE s.category_id IS NULL
          AND (p_type = 'all' OR s.type = p_type)
          AND s.status::public.item_status = 'pending'::public.item_status
    )
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;