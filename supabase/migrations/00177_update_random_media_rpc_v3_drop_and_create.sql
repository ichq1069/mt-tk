-- 先删除再重新创建以修改返回列
DROP FUNCTION IF EXISTS get_random_media_items(p_limit INTEGER, p_user_id UUID);

CREATE OR REPLACE FUNCTION get_random_media_items(p_limit INTEGER, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    title TEXT,
    url TEXT,
    thumbnail_url TEXT,
    type TEXT,
    category_id UUID,
    user_id UUID,
    view_count BIGINT,
    favorite_count BIGINT,
    created_at TIMESTAMPTZ,
    status TEXT,
    deleted_at TIMESTAMPTZ,
    username TEXT,
    avatar_url TEXT,
    media_tags JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, 
        m.title, 
        m.url, 
        m.thumbnail_url, 
        m.type, 
        m.category_id, 
        m.user_id, 
        COALESCE(m.view_count, 0)::bigint, 
        COALESCE(m.favorite_count, 0)::bigint, 
        m.created_at, 
        m.status, 
        m.deleted_at,
        p.username, 
        p.avatar_url,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
             FROM public.media_tags mt
             JOIN public.tags t ON mt.tag_id = t.id
             WHERE mt.media_id = m.id),
            '[]'::jsonb
        ) as media_tags
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
