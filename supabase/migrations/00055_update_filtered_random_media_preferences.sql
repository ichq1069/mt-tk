CREATE OR REPLACE FUNCTION public.get_filtered_random_media(limit_count integer, current_user_id uuid)
 RETURNS SETOF media_items
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  disliked_cats uuid[];
  disliked_tags uuid[];
BEGIN
  -- 获取用户偏好
  SELECT 
    ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_categories')::uuid) as disliked_categories,
    ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_tags')::uuid) as disliked_tags
  INTO disliked_cats, disliked_tags
  FROM profiles 
  WHERE id = current_user_id;

  RETURN QUERY 
  SELECT m.* 
  FROM media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.id NOT IN (SELECT media_id FROM favorites WHERE user_id = current_user_id)
    AND m.id NOT IN (SELECT media_id FROM dislikes WHERE user_id = current_user_id)
    AND (disliked_cats IS NULL OR m.category_id IS NULL OR m.category_id <> ALL(disliked_cats))
    AND (disliked_tags IS NULL OR NOT EXISTS (
      SELECT 1 FROM media_tags mt 
      WHERE mt.media_id = m.id 
      AND mt.tag_id = ANY(disliked_tags)
    ))
  ORDER BY random() 
  LIMIT limit_count;
END;
$function$;