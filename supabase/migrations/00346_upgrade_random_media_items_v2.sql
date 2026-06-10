DROP FUNCTION IF EXISTS get_random_media_items(integer, uuid);

CREATE OR REPLACE FUNCTION get_random_media_items(
    p_limit integer, 
    p_user_id uuid DEFAULT NULL,
    p_type text DEFAULT 'all',
    p_category_id text DEFAULT 'all',
    p_tag_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    url text,
    thumbnail_url text,
    type text,
    category_id uuid,
    user_id uuid,
    view_count bigint,
    favorite_count bigint,
    created_at timestamp with time zone,
    status text,
    deleted_at timestamp with time zone,
    is_hidden boolean,
    username text,
    avatar_url text,
    content_categories_json jsonb,
    media_tags jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        m.status::text,
        m.deleted_at,
        m.is_hidden,
        p.username, 
        p.avatar_url,
        to_jsonb(cc.*) as content_categories_json,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
             FROM public.media_tags mt
             JOIN public.tags t ON mt.tag_id = t.id
             WHERE mt.media_id = m.id),
            '[]'::jsonb
        ) as media_tags
    FROM public.media_items m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    LEFT JOIN public.content_categories cc ON m.category_id = cc.id
    WHERE m.status::public.item_status = 'approved'::public.item_status 
      AND m.deleted_at IS NULL
      AND m.is_hidden = false
      AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
      -- 全局可见性过滤
      AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
      AND NOT EXISTS (
          SELECT 1 FROM public.media_tags mt
          JOIN public.tags t ON mt.tag_id = t.id
          WHERE mt.media_id = m.id AND t.is_visible = false
      )
      -- 动态过滤
      AND (p_type = 'all' OR m.type = p_type)
      AND (
        p_category_id = 'all' 
        OR (p_category_id = 'none' AND m.category_id IS NULL)
        OR (p_category_id != 'none' AND p_category_id != 'all' AND m.category_id = p_category_id::uuid)
      )
      AND (
        p_tag_ids IS NULL 
        OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL 
        OR (
            p_tag_ids = ARRAY['00000000-0000-0000-0000-000000000000']::uuid[] 
            AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id)
        )
        OR EXISTS (
          SELECT 1 FROM public.media_tags mt 
          WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
        )
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$;
