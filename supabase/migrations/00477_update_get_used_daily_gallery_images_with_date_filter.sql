-- Update get_used_daily_gallery_images to support date filtering
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    used_at timestamp with time zone,
    post_date date,
    has_record boolean,
    daily_gallery_status text,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
BEGIN
  -- 计算总数
  SELECT count(*) INTO v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date);

  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    COALESCE(p.created_at, m.created_at) as used_at, 
    COALESCE(m.daily_gallery_date, p.post_date) as post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text,
    v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date)
  ORDER BY COALESCE(m.daily_gallery_date, p.post_date) DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
