-- 更新 batch_insert_zonerama_photos 函数，跳过黑名单中的图片
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
      
      -- 检查是否在黑名单中
      SELECT status INTO v_existing_status
      FROM public.zonerama_library
      WHERE album_id = p_album_id AND photo_id = v_photo_id;
      
      -- 如果在黑名单中，跳过
      IF v_existing_status = 'blacklisted' THEN
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
        status = CASE 
          WHEN zonerama_library.status = 'recycled' THEN 'pending'
          ELSE zonerama_library.status
        END,
        url = EXCLUDED.url,
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