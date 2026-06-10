CREATE OR REPLACE FUNCTION public.get_related_media(p_media_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH current_media_tags AS (
        SELECT tag_id FROM public.media_tags WHERE media_id = p_media_id
    ),
    related_media_scores AS (
        SELECT 
            mt.media_id,
            COUNT(*) as common_tags_count
        FROM public.media_tags mt
        JOIN current_media_tags cmt ON mt.tag_id = cmt.tag_id
        WHERE mt.media_id != p_media_id
        GROUP BY mt.media_id
    )
    SELECT m.*
    FROM public.media_items m
    JOIN related_media_scores rms ON m.id = rms.media_id
    WHERE m.status::public.item_status = 'approved'::public.item_status
    ORDER BY rms.common_tags_count DESC, m.created_at DESC
    LIMIT p_limit;
END;
$$;
