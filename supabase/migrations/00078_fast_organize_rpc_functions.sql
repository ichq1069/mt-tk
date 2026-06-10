-- Function to get uncategorized media excluding current user's pending items
CREATE OR REPLACE FUNCTION public.get_fast_organize_uncategorized(p_user_id UUID, p_type TEXT DEFAULT 'all', p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
) AS $$
BEGIN
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
    ORDER BY m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's pending items
CREATE OR REPLACE FUNCTION public.get_fast_organize_pending(p_user_id UUID, p_type TEXT DEFAULT 'all', p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
        p.username, p.avatar_url
    FROM public.media_items m
    INNER JOIN public.user_pending_items upi ON upi.media_id = m.id
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE upi.user_id = p_user_id
      AND m.category_id IS NULL
      AND m.deleted_at IS NULL
      AND (p_type = 'all' OR m.type = p_type)
    ORDER BY upi.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
