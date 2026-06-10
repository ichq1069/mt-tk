CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images_v2(
  p_limit integer, 
  p_offset integer,
  p_excluded_categories uuid[] DEFAULT ARRAY[]::uuid[],
  p_excluded_tags uuid[] DEFAULT ARRAY[]::uuid[]
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
    -- 排除特定分类
    AND (m.category_id IS NULL OR NOT (m.category_id = ANY(p_excluded_categories)))
    -- 排除含有“限制级”标签的图片
    AND NOT EXISTS (
      SELECT 1 
      FROM public.tags t 
      JOIN public.media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND t.name = '限制级'
    )
    -- 排除特定标签
    AND NOT EXISTS (
      SELECT 1 
      FROM public.media_tags mt 
      WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_excluded_tags)
    )
    -- 排除已经发布过的图片
    AND NOT EXISTS (
      SELECT 1 
      FROM public.daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY m.created_at DESC -- 分页需要稳定排序
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;