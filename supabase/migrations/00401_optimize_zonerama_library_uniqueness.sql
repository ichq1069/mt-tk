-- 1. 优化 zonerama_library 表唯一约束
-- 首先删除旧的 (album_id, photo_id) 唯一约束
ALTER TABLE public.zonerama_library DROP CONSTRAINT IF EXISTS zonerama_library_album_id_photo_id_key;

-- 检查并处理重复的 photo_id（保留最新的一个）
DELETE FROM public.zonerama_library a
USING public.zonerama_library b
WHERE a.id < b.id AND a.photo_id = b.photo_id;

-- 添加针对 photo_id 的单列唯一约束，确保全局唯一，避免重复
ALTER TABLE public.zonerama_library ADD CONSTRAINT zonerama_library_photo_id_key UNIQUE (photo_id);

-- 2. 更新批量插入函数，改为基于 photo_id 的冲突处理
CREATE OR REPLACE FUNCTION public.batch_insert_zonerama_photos(p_album_id text, p_photos jsonb)
 RETURNS TABLE(inserted_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_inserted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_photo JSONB;
  v_photo_id TEXT;
  v_existing_status TEXT;
BEGIN
  FOR v_photo IN SELECT * FROM jsonb_array_elements(p_photos)
  LOOP
    BEGIN
      v_photo_id := v_photo->>'photo_id';
      
      -- 检查是否在黑名单中 (全局检查，不再受 album_id 限制)
      SELECT status INTO v_existing_status
      FROM public.zonerama_library
      WHERE photo_id = v_photo_id;
      
      -- 如果在黑名单中，跳过
      IF v_existing_status = 'blacklisted' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- 插入或更新
      -- 基于 photo_id 冲突处理，实现全局去重
      INSERT INTO public.zonerama_library (album_id, photo_id, url, title, status)
      VALUES (
        p_album_id,
        v_photo_id,
        v_photo->>'url',
        v_photo->>'title',
        'pending'
      )
      ON CONFLICT (photo_id) 
      DO UPDATE SET
        -- 如果之前在回收站，则恢复为 pending；否则保持原状态
        status = CASE 
          WHEN zonerama_library.status = 'recycled' THEN 'pending'
          ELSE zonerama_library.status
        END,
        -- 更新 URL 和标题（以最新拉取的为准）
        url = EXCLUDED.url,
        title = EXCLUDED.title,
        -- 保留原有的 album_id 还是更新？通常保留第一个关联的 album_id 即可，
        -- 但为了准确性，这里我们不强制更新 album_id，以免覆盖
        updated_at = NOW();
      
      IF FOUND THEN
        v_inserted_count := v_inserted_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted_count, v_skipped_count;
END;
$function$;
