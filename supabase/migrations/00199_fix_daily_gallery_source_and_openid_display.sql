-- 获取适合发布到每日图集的随机图片
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
    AND m.id NOT IN (
      SELECT COALESCE(unnest(image_ids), '00000000-0000-0000-0000-000000000000'::uuid) FROM daily_gallery_posts
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- 修正从已有的解密 XML 中找回 OpenID (前提是 raw_xml 已经是明文，我的新版 Edge Function 会存明文)
-- 这条 SQL 建议用户在有明文数据后手动运行或作为一种预防
-- UPDATE wechat_messages 
-- SET from_user = (regexp_match(raw_xml, '<FromUserName><!\[CDATA\[(.*?)\]\]></FromUserName>'))[1]
-- WHERE from_user = 'unknown_user' AND raw_xml ~ '<FromUserName><!\[CDATA\[.*?\]\]></FromUserName>';
