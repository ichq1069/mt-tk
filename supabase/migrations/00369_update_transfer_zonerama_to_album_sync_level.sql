-- 更新 transfer_zonerama_to_album 函数，同步 level 信息
CREATE OR REPLACE FUNCTION public.transfer_zonerama_to_album(p_photo_ids uuid[], p_target_album_id uuid)
RETURNS TABLE(success_count integer, error_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_photo_id UUID;
  v_photo RECORD;
BEGIN
  FOREACH v_photo_id IN ARRAY p_photo_ids
  LOOP
    BEGIN
      -- 获取 Zonerama 图片信息
      SELECT * INTO v_photo FROM public.zonerama_library WHERE id = v_photo_id;
      
      IF v_photo.id IS NOT NULL THEN
        -- 插入到 album_photos 表（写真库），同步 level 信息
        INSERT INTO public.album_photos (
          album_id,
          url,
          level,
          sort_order
        )
        VALUES (
          p_target_album_id,
          v_photo.url,
          v_photo.level, -- 同步等级信息
          0
        );
        
        -- 更新 Zonerama 库状态
        UPDATE public.zonerama_library
        SET 
          status = 'transferred_to_album',
          transferred_to = 'album',
          transferred_at = NOW(),
          updated_at = NOW()
        WHERE id = v_photo_id;
        
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_success_count, v_error_count;
END;
$function$;