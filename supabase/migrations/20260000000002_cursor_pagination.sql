-- 游标分页优化：替换 OFFSET 分页

-- 创建游标分页函数：获取媒体列表（基于 created_at 游标）
CREATE OR REPLACE FUNCTION get_media_cursor_paginated(
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_user_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'all',
  p_category_id TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'approved'::public.item_status
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  url TEXT,
  thumbnail_url TEXT,
  type TEXT,
  title TEXT,
  description TEXT,
  status TEXT,
  category_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  view_count INT,
  like_count INT,
  favorite_count INT,
  username TEXT,
  avatar_url TEXT,
  next_cursor TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.url,
    m.thumbnail_url,
    m.type,
    m.title,
    m.description,
    m.status,
    m.category_id,
    m.created_at,
    m.updated_at,
    m.view_count,
    m.like_count,
    m.favorite_count,
    p.username,
    p.avatar_url,
    m.created_at as next_cursor
  FROM media_items m
  LEFT JOIN profiles p ON m.user_id = p.id
  WHERE 
    m.deleted_at IS NULL
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
    AND (p_status = 'all' OR m.status = p_status::public.item_status)
    AND (p_type = 'all' OR m.type = p_type)
    AND (p_category_id = 'all' OR m.category_id::TEXT = p_category_id)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 创建游标分页函数：获取用户收藏列表
CREATE OR REPLACE FUNCTION get_favorites_cursor_paginated(
  p_user_id UUID,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  media_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_type TEXT,
  media_title TEXT,
  next_cursor TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.media_id,
    f.user_id,
    f.created_at,
    m.url as media_url,
    m.thumbnail_url as media_thumbnail_url,
    m.type as media_type,
    m.title as media_title,
    f.created_at as next_cursor
  FROM favorites f
  INNER JOIN media_items m ON f.media_id = m.id
  WHERE 
    f.user_id = p_user_id
    AND m.deleted_at IS NULL
    AND (p_cursor IS NULL OR f.created_at < p_cursor)
  ORDER BY f.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_media_cursor_paginated IS '游标分页获取媒体列表，避免OFFSET性能问题';
COMMENT ON FUNCTION get_favorites_cursor_paginated IS '游标分页获取收藏列表';
