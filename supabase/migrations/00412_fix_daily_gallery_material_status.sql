-- 1. 设置 daily_gallery_status 默认值为 'unused'
ALTER TABLE public.media_items 
ALTER COLUMN daily_gallery_status SET DEFAULT 'unused';

-- 2. 将所有 NULL 的 daily_gallery_status 更新为 'unused'（排除已在发布记录中的）
UPDATE public.media_items m
SET daily_gallery_status = 'unused'
WHERE m.daily_gallery_status IS NULL
  AND m.type = 'image'
  AND m.status::public.item_status = 'approved'::public.item_status
  AND m.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.daily_gallery_posts p 
    WHERE m.id = ANY(p.image_ids)
  );

-- 3. 将已在发布记录中但状态不是 'used' 的图片更新为 'used'
UPDATE public.media_items m
SET daily_gallery_status = 'used'
WHERE m.type = 'image'
  AND m.deleted_at IS NULL
  AND (m.daily_gallery_status IS NULL OR m.daily_gallery_status != 'used')
  AND EXISTS (
    SELECT 1 FROM public.daily_gallery_posts p 
    WHERE m.id = ANY(p.image_ids)
  );

-- 4. 优化 get_daily_gallery_available_images_rpc，确保已发布的不会出现在待发布列表
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'unused'
)
RETURNS TABLE (
  id uuid,
  url text,
  title text,
  description text,
  status text,
  daily_gallery_status text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_images AS (
    SELECT 
      m.id, 
      m.url, 
      m.title, 
      m.description, 
      m.status::text, 
      COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
      m.created_at
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
      AND m.is_hidden = false
      AND m.type = 'image'
      AND m.deleted_at IS NULL
      AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
      AND COALESCE(m.daily_gallery_status, 'unused') = p_status
      AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
      -- 核心修复：无论什么状态，只要已在发布记录中，就不显示在待使用或待发布列表
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_gallery_posts p 
        WHERE m.id = ANY(p.image_ids)
      )
  )
  SELECT *, (SELECT count(*) FROM filtered_images) AS total_count
  FROM filtered_images
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;