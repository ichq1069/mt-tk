-- 修复 batch_insert_zonerama_photos 函数的重复计数问题
-- 问题：ON CONFLICT DO UPDATE 后 FOUND 总是为 true，导致更新操作也被计入 inserted_count
-- 解决：使用 xmax 判断是否为插入操作（xmax = 0 表示插入，xmax != 0 表示更新）

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
  v_was_inserted BOOLEAN;
BEGIN
  FOR v_photo IN SELECT * FROM jsonb_array_elements(p_photos)
  LOOP
    BEGIN
      v_photo_id := v_photo->>'photo_id';
      
      -- 检查是否在黑名单中
      SELECT status INTO v_existing_status
      FROM public.zonerama_library
      WHERE album_id = p_album_id AND photo_id = v_photo_id;
      
      -- 如果在黑名单中，跳过
      IF v_existing_status = 'blacklisted' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- 如果已存在且不是回收站状态，跳过（避免重复导入）
      IF v_existing_status IS NOT NULL AND v_existing_status != 'recycled' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- 插入或更新（如果是回收站中的图片，恢复为 pending）
      INSERT INTO public.zonerama_library (album_id, photo_id, url, title, status)
      VALUES (
        p_album_id,
        v_photo_id,
        v_photo->>'url',
        v_photo->>'title',
        'pending'
      )
      ON CONFLICT (album_id, photo_id) 
      DO UPDATE SET
        status::public.item_status = 'pending'::public.item_status,
        url = EXCLUDED.url,
        updated_at = NOW()
      RETURNING (xmax = 0) INTO v_was_inserted;
      
      -- xmax = 0 表示插入，xmax != 0 表示更新
      IF v_was_inserted THEN
        v_inserted_count := v_inserted_count + 1;
      ELSE
        -- 从回收站恢复也算作插入
        v_inserted_count := v_inserted_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted_count, v_skipped_count;
END;
$function$;
