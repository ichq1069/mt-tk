CREATE OR REPLACE FUNCTION get_recommended_media_v3(
    p_user_id UUID,
    p_limit INTEGER,
    p_offset INTEGER,
    p_intensity FLOAT DEFAULT 1.0
)
RETURNS SETOF media_items AS $$
DECLARE
    v_intensity_multiplier FLOAT;
BEGIN
    v_intensity_multiplier := COALESCE(p_intensity, 1.0);
    
    RETURN QUERY
    WITH user_tag_preferences AS (
        -- 基于显式标签偏好
        SELECT 
            (elem->>'id')::UUID as tag_id,
            10.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(COALESCE(p.custom_fields->'preferences'->'liked_tags', '[]'::jsonb)) as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        SELECT 
            (elem->>'id')::UUID as tag_id,
            -50.0 as score
        FROM public.profiles p,
        LATERAL jsonb_array_elements(COALESCE(p.custom_fields->'preferences'->'disliked_tags', '[]'::jsonb)) as elem
        WHERE p.id = p_user_id
        
        UNION ALL
        
        -- 基于隐式行为偏好
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
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.is_hidden = FALSE AND m.deleted_at IS NULL
        GROUP BY m.id
    )
    SELECT m.*
    FROM public.media_items m
    JOIN media_scores ms ON m.id = ms.id
    ORDER BY 
        (CASE WHEN m.is_recommended THEN 5000 ELSE 0 END) + -- 手动推荐高优先级
        m.heat_score +                                    -- 热度排序
        ms.media_relevance DESC,                          -- 个性化相关性
        m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
