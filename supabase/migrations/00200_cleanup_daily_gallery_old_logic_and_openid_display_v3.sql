-- 1. 删除旧的函数 (如果有)
DROP FUNCTION IF EXISTS get_random_daily_gallery_images(integer);
DROP FUNCTION IF EXISTS get_random_daily_gallery_images(p_count integer);
DROP FUNCTION IF EXISTS get_random_unused_images(count integer);
DROP FUNCTION IF EXISTS mark_images_as_used(uuid[], uuid);

-- 2. 创建新的随机抽选函数
CREATE OR REPLACE FUNCTION get_random_daily_gallery_images(p_count INTEGER)
RETURNS TABLE (id UUID, url TEXT, title TEXT, description TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description
  FROM media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.is_hidden = false 
    AND m.type = 'image'
    AND NOT EXISTS (
      SELECT 1 
      FROM tags t 
      JOIN media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND t.name = '限制级'
    )
    AND NOT EXISTS (
      -- 排除最近发布过的，避免重复 (这里检查所有已发布记录的 image_ids)
      SELECT 1 
      FROM daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- 3. 彻底删除旧的独立素材库表
DROP TABLE IF EXISTS daily_gallery_pool;
