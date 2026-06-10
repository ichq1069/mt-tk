CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(
  p_limit integer, 
  p_offset integer,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  url text, 
  title text, 
  description text, 
  used_at timestamp with time zone, 
  post_date date
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, p.created_at as used_at, p.post_date
  FROM public.media_items m
  JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.type = 'image'
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  ORDER BY p.post_date DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;