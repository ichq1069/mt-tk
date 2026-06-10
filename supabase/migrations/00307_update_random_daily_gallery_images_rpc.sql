CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(
  p_count integer,
  p_excluded_categories uuid[] DEFAULT '{}',
  p_excluded_tags uuid[] DEFAULT '{}'
)
RETURNS TABLE(id uuid, url text, title text, description text, status text)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, m.status::text
  FROM public.media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.is_hidden = false 
    AND m.type = 'image'
    AND COALESCE(m.exclude_from_daily_gallery, false) = false
    AND (
      p_excluded_categories = '{}' OR 
      m.category_id IS NULL OR 
      NOT (m.category_id = ANY(p_excluded_categories))
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM public.tags t 
      JOIN public.media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND (
        t.name = '限制级' OR
        t.id = ANY(p_excluded_tags)
      )
    )
    AND NOT EXISTS (
      -- 排除最近发布过的，避免重复
      SELECT 1 
      FROM public.daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;