DROP FUNCTION IF EXISTS public.get_fast_organize_pending(uuid,text,integer,integer);

CREATE OR REPLACE FUNCTION public.get_fast_organize_pending(
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
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.title, m.url, m.type, m.category_id, m.user_id, m.created_at,
        p.username, p.avatar_url, 'media_items'::text as source_table
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
$$ LANGUAGE plpgsql;