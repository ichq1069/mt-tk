CREATE OR REPLACE FUNCTION public.get_recommended_media_v2(
    p_user_id UUID DEFAULT NULL, 
    p_limit INTEGER DEFAULT 10, 
    p_offset INTEGER DEFAULT 0,
    p_intensity INTEGER DEFAULT 1
)
RETURNS SETOF public.media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intensity_multiplier FLOAT;
BEGIN
    v_intensity_multiplier := p_intensity::FLOAT;
    
    RETURN QUERY
    WITH user_tag_preferences AS (
        -- 基于显式标签偏好 (like: +10, dislike: -50)
        SELECT 
            (elem->>'id')::UUID as tag_id,
            10.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(p.custom_fields->'preferences'->'liked_tags') as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        SELECT 
            (elem->>'id')::UUID as tag_id,
            -50.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(p.custom_fields->'preferences'->'disliked_tags') as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        -- 基于隐式行为偏好 (view: 1, click: 2, favorite: 5)
        -- 使用 intensity_multiplier 放大行为权重
        SELECT 
            mt.tag_id,
            SUM(ui.weight)::FLOAT * v_intensity_multiplier as score
        FROM public.user_interactions ui
        JOIN public.media_tags mt ON ui.media_id = mt.media_id
        WHERE ui.user_id = p_user_id
        GROUP BY mt.tag_id
    ),
    tag_scores AS (
        SELECT tag_id, SUM(score) as total_score
        FROM user_tag_preferences
        GROUP BY tag_id
    ),
    media_scores AS (
        SELECT 
            m.id,
            COALESCE(SUM(ts.total_score), 0) as media_relevance
        FROM public.media_items m
        LEFT JOIN public.media_tags mt ON m.id = mt.media_id
        LEFT JOIN tag_scores ts ON mt.tag_id = ts.tag_id
        WHERE m.status::public.item_status = 'approved'::public.item_status
        GROUP BY m.id
    )
    SELECT m.*
    FROM public.media_items m
    JOIN media_scores ms ON m.id = ms.id
    ORDER BY ms.media_relevance DESC, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
