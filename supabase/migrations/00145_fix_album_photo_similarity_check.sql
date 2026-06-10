-- 新增：检查图集内是否存在相似指纹的函数
CREATE OR REPLACE FUNCTION public.check_album_photo_similar(p_album_id uuid, p_hash text, p_threshold integer DEFAULT 5)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM public.album_photos m
  WHERE m.album_id = p_album_id
    AND m.content_hash IS NOT NULL
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  LIMIT 1;
END;
$function$;
