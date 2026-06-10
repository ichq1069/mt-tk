-- 彻底清理并重新编译余下的所有返回 SETOF media_items 的函数

-- 1. get_unique_media_items
DROP FUNCTION IF EXISTS public.get_unique_media_items(integer, integer);
CREATE OR REPLACE FUNCTION public.get_unique_media_items(p_limit integer, p_offset integer)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM media_items
    WHERE id IN (
        SELECT DISTINCT ON (content_hash) id
        FROM media_items
        WHERE type = 'image' AND content_hash IS NOT NULL AND deleted_at IS NULL
        ORDER BY content_hash, created_at ASC
    )
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;

-- 2. get_top_disliked_media
DROP FUNCTION IF EXISTS public.get_top_disliked_media(integer);
CREATE OR REPLACE FUNCTION public.get_top_disliked_media(p_limit integer)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM public.media_items m
    JOIN (
        SELECT media_id, COUNT(*) as d_count
        FROM public.dislikes
        GROUP BY media_id
    ) d ON m.id = d.media_id
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL
    ORDER BY d.d_count DESC
    LIMIT p_limit;
END;
$function$;
