-- 首先删除旧版本的函数
DROP FUNCTION IF EXISTS public.get_visually_duplicate_media();
DROP FUNCTION IF EXISTS public.get_visually_duplicate_media(integer);
DROP FUNCTION IF EXISTS public.clear_all_visual_duplicates();

-- 创建汉明距离辅助函数
CREATE OR REPLACE FUNCTION public.hamming_distance(h1 text, h2 text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- 如果任一哈希为空，则返回极高距离
  IF h1 IS NULL OR h2 IS NULL OR h1 = '' OR h2 = '' THEN
    RETURN 100;
  END IF;
  -- 尝试转换为 bit(64) 并计算 XOR 的 bit_count
  -- 兼容不同长度，左侧补零至16位
  RETURN bit_count(('x' || lpad(h1, 16, '0'))::bit(64) # ('x' || lpad(h2, 16, '0'))::bit(64));
EXCEPTION WHEN OTHERS THEN
  RETURN 100;
END;
$$;

-- 重写获取相似图集分组的函数
CREATE OR REPLACE FUNCTION public.get_visually_duplicate_media(p_threshold integer DEFAULT 5)
 RETURNS TABLE(content_hash text, duplicate_count bigint, first_upload_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH valid_items AS (
    -- 提取所有有效的图片指纹数据
    SELECT m.id, m.content_hash, m.created_at
    FROM public.media_items m
    WHERE m.content_hash IS NOT NULL AND m.type = 'image' AND m.deleted_at IS NULL
  ),
  representatives AS (
    -- 核心逻辑：在每一个“相似圈”中，只选出最早的那一个作为“代表”
    -- 如果一个项存在另一个更早且相似的项，那它就不是代表
    SELECT m1.id, m1.content_hash, m1.created_at
    FROM valid_items m1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items m2
      WHERE m2.id != m1.id
      -- 相似判定：汉明距离在阈值内
      AND bit_count(('x' || lpad(m1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(m2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      -- 排序判定：找比自己更早的
      AND (m2.created_at < m1.created_at OR (m2.created_at = m1.created_at AND m2.id < m1.id))
    )
  )
  -- 统计每个代表周围有多少个相似项（含自己）
  SELECT 
    r.content_hash,
    COUNT(v.id)::BIGINT as duplicate_count,
    MIN(v.created_at) as first_upload_at
  FROM representatives r
  JOIN valid_items v ON (
    bit_count(('x' || lpad(r.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v.content_hash, 16, '0'))::bit(64)) <= p_threshold
  )
  GROUP BY r.id, r.content_hash
  HAVING COUNT(v.id) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;

-- 新增：通过相似哈希获取具体媒体列表的函数
CREATE OR REPLACE FUNCTION public.get_media_by_similar_hash(p_hash text, p_threshold integer DEFAULT 5)
 RETURNS TABLE(id uuid, user_id uuid, url text, type text, content_hash text, created_at timestamp with time zone, profiles jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.user_id, m.url, m.type, m.content_hash, m.created_at,
    CASE 
      WHEN p.id IS NOT NULL THEN row_to_json(p)::jsonb 
      ELSE NULL 
    END as profiles
  FROM public.media_items m
  LEFT JOIN public.profiles p ON m.user_id = p.id
  WHERE m.content_hash IS NOT NULL 
    AND m.type = 'image' 
    AND m.deleted_at IS NULL
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  ORDER BY m.created_at ASC;
END;
$function$;

-- 重写批量清理相似重复项的函数
CREATE OR REPLACE FUNCTION public.clear_all_visual_duplicates(p_threshold integer DEFAULT 5)
 RETURNS TABLE(deleted_count bigint, saved_space_estimate text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  WITH valid_items AS (
    SELECT id, content_hash, created_at
    FROM public.media_items
    WHERE content_hash IS NOT NULL AND type = 'image' AND deleted_at IS NULL
  ),
  to_keep AS (
    -- 找出所有作为“代表”的项（即在该相似圈内最旧的项）
    SELECT m1.id
    FROM valid_items m1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items m2
      WHERE m2.id != m1.id
      AND bit_count(('x' || lpad(m1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(m2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      AND (m2.created_at < m1.created_at OR (m2.created_at = m1.created_at AND m2.id < m1.id))
    )
  )
  DELETE FROM public.media_items
  WHERE type = 'image' 
    AND content_hash IS NOT NULL 
    AND deleted_at IS NULL
    AND id NOT IN (SELECT id FROM to_keep);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count, '已清理相似内容并保留最早版本';
END;
$function$;
