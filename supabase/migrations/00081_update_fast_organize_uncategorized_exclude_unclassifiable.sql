CREATE OR REPLACE FUNCTION public.get_fast_organize_uncategorized(
    p_user_id UUID,
    p_type TEXT DEFAULT 'all',
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    url TEXT,
    type TEXT,
    category_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ,
    username TEXT,
    avatar_url TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_unclassifiable_category_id UUID;
BEGIN
    -- 获取"无法分类"分类的 ID
    SELECT cc.id INTO v_unclassifiable_category_id
    FROM public.content_categories cc
    WHERE cc.name = '无法分类'
    LIMIT 1;

    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
        p.username, p.avatar_url
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
          SELECT media_id FROM public.media_items WHERE category_id = v_unclassifiable_category_id
      ))
    ORDER BY m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
