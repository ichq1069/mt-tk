-- Redefine Recommended Media
CREATE OR REPLACE FUNCTION public.get_recommended_media(p_user_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 10, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id UUID,
    title TEXT,
    url TEXT,
    thumbnail_url TEXT,
    type TEXT,
    category_id UUID,
    user_id UUID,
    view_count BIGINT,
    favorite_count INTEGER,
    created_at TIMESTAMPTZ,
    status TEXT,
    deleted_at TIMESTAMPTZ,
    is_private BOOLEAN,
    username TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id, 
        m.view_count, m.favorite_count, m.created_at, m.status, m.deleted_at, m.is_private,
        p.username, p.avatar_url
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
    ORDER BY (COALESCE(m.favorite_count, 0) * 5 + COALESCE(m.view_count, 0)) DESC, m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine Random Media
CREATE OR REPLACE FUNCTION public.get_random_media_items(p_user_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    url TEXT,
    thumbnail_url TEXT,
    type TEXT,
    category_id UUID,
    user_id UUID,
    view_count BIGINT,
    favorite_count INTEGER,
    created_at TIMESTAMPTZ,
    status TEXT,
    deleted_at TIMESTAMPTZ,
    is_private BOOLEAN,
    username TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id, 
        m.view_count, m.favorite_count, m.created_at, m.status, m.deleted_at, m.is_private,
        p.username, p.avatar_url
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
