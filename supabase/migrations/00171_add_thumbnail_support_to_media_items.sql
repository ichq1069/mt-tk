-- 添加缩略图字段到 media_items 表
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 添加缩略图格式字段
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS thumbnail_format TEXT DEFAULT 'webp';

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_media_items_thumbnail_url ON public.media_items(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- 修改查重逻辑，排除缩略图
-- 更新现有的查重函数，添加缩略图排除逻辑
CREATE OR REPLACE FUNCTION public.find_duplicate_media(
  p_file_hash TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.url,
    m.thumbnail_url,
    m.title,
    m.user_id,
    m.created_at,
    1.0 as similarity
  FROM public.media_items m
  WHERE m.file_hash = p_file_hash
    AND m.status != 'deleted'
    -- 排除缩略图URL的查重
    AND m.url NOT LIKE '%/thumbnails/%'
    AND (p_user_id IS NULL OR m.user_id != p_user_id)
  ORDER BY m.created_at DESC
  LIMIT 10;
END;
$$;

-- 创建删除媒体时同时删除缩略图的触发器函数
CREATE OR REPLACE FUNCTION public.delete_media_with_thumbnail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 如果有缩略图URL，记录到日志（实际删除由应用层处理）
  IF OLD.thumbnail_url IS NOT NULL THEN
    -- 这里可以添加日志记录或通知机制
    RAISE NOTICE 'Media deleted with thumbnail: % -> %', OLD.url, OLD.thumbnail_url;
  END IF;
  
  RETURN OLD;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_delete_media_with_thumbnail ON public.media_items;
CREATE TRIGGER trigger_delete_media_with_thumbnail
  BEFORE DELETE ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_media_with_thumbnail();

-- 创建获取媒体列表的优化函数（优先返回缩略图）
CREATE OR REPLACE FUNCTION public.get_media_with_thumbnails(
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'approved'::public.item_status
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  thumbnail_url TEXT,
  display_url TEXT,
  title TEXT,
  type TEXT,
  status TEXT,
  view_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.url,
    m.thumbnail_url,
    COALESCE(m.thumbnail_url, m.url) as display_url,
    m.title,
    m.type,
    m.status,
    m.view_count,
    m.created_at
  FROM public.media_items m
  WHERE (p_status IS NULL OR m.status = p_status::public.item_status)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
  ORDER BY m.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON COLUMN public.media_items.thumbnail_url IS '缩略图URL（优先使用WebP格式）';
COMMENT ON COLUMN public.media_items.thumbnail_format IS '缩略图格式（webp/jpeg/png）';
COMMENT ON FUNCTION public.find_duplicate_media IS '查找重复媒体（排除缩略图）';
COMMENT ON FUNCTION public.delete_media_with_thumbnail IS '删除媒体时同时处理缩略图';
COMMENT ON FUNCTION public.get_media_with_thumbnails IS '获取媒体列表（优先返回缩略图）';
