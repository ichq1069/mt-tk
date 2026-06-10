-- Drop existing functions before recreation to avoid return type issues
DROP FUNCTION IF EXISTS public.get_random_media(integer);
DROP FUNCTION IF EXISTS public.get_recommended_media(integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_unique_media_items(integer, integer);

-- Update random media function
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

-- Update recommended media function
CREATE OR REPLACE FUNCTION public.get_recommended_media(page_offset integer DEFAULT 0, page_limit integer DEFAULT 10, current_user_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select m.*
  from media_items m
  where m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL
  and (
    current_user_id is null 
    or not exists (
      select 1 from dislikes d 
      where d.media_id = m.id and d.user_id = current_user_id
    )
  )
  order by (coalesce(m.favorite_count, 0) * 5 + coalesce(m.views_count, 0)) desc, m.created_at desc
  limit page_limit
  offset page_offset;
end;
$function$;

-- Update unique media function
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

-- Disable tag re-triggering on update to maintain persistence
DROP TRIGGER IF EXISTS trigger_auto_tag_after_update ON public.media_items;
