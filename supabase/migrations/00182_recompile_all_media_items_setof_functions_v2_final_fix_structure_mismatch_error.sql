-- 重新编译所有返回 SETOF media_items 的函数，以修复 "structure of query does not match function result type" 错误
-- 这个问题是因为 media_items 表结构发生变化，而使用 SELECT * 的内部查询未能自动同步导致的

-- 1. get_random_media
CREATE OR REPLACE FUNCTION public.get_random_media(limit_count integer)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM media_items
  WHERE status::public.item_status = 'approved'::public.item_status AND deleted_at IS NULL
  ORDER BY random()
  LIMIT limit_count;
END;
$function$;

-- 2. get_filtered_random_media (如果存在)
CREATE OR REPLACE FUNCTION public.get_filtered_random_media(limit_count integer, p_type text DEFAULT 'all', p_category_id uuid DEFAULT NULL)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM media_items
  WHERE status::public.item_status = 'approved'::public.item_status 
    AND deleted_at IS NULL
    AND (p_type = 'all' OR type = p_type)
    AND (p_category_id IS NULL OR category_id = p_category_id)
  ORDER BY random()
  LIMIT limit_count;
END;
$function$;

-- 3. get_related_media
CREATE OR REPLACE FUNCTION public.get_related_media(p_media_id uuid, p_limit integer DEFAULT 10)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tag_ids uuid[];
BEGIN
    -- 获取当前媒体的所有标签ID
    SELECT ARRAY_AGG(tag_id) INTO v_tag_ids
    FROM public.media_tags
    WHERE media_id = p_media_id;

    RETURN QUERY
    SELECT DISTINCT m.*
    FROM public.media_items m
    JOIN public.media_tags mt ON m.id = mt.media_id
    WHERE m.id != p_media_id
      AND m.status::public.item_status = 'approved'::public.item_status
      AND m.deleted_at IS NULL
      AND (
          mt.tag_id = ANY(v_tag_ids) OR
          m.category_id = (SELECT category_id FROM public.media_items WHERE id = p_media_id)
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$function$;

-- 4. 再次确认推荐系统函数 (v2 和 v3)
CREATE OR REPLACE FUNCTION public.get_recommended_media_v2(p_user_id uuid, p_limit integer, p_offset integer)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH user_tag_preferences AS (
        SELECT mt.tag_id, COUNT(*)::float as weight
        FROM public.user_interactions ui
        JOIN public.media_tags mt ON ui.media_id = mt.media_id
        WHERE ui.user_id = p_user_id
        GROUP BY mt.tag_id
    ),
    media_scores AS (
        SELECT 
            m.id,
            COALESCE(SUM(tp.weight), 0) as relevance_score
        FROM public.media_items m
        LEFT JOIN public.media_tags mt ON m.id = mt.media_id
        LEFT JOIN user_tag_preferences tp ON mt.tag_id = tp.tag_id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL
        GROUP BY m.id
    )
    SELECT m.*
    FROM public.media_items m
    JOIN media_scores ms ON m.id = ms.id
    ORDER BY ms.relevance_score DESC, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
