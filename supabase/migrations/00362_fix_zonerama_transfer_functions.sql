-- 修复转移到壁纸库的 RPC 函数
CREATE OR REPLACE FUNCTION public.transfer_zonerama_to_wallpaper(
  p_photo_ids UUID[]
)
RETURNS TABLE(success_count INTEGER, error_count INTEGER) AS $$
DECLARE
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_photo_id UUID;
  v_photo RECORD;
  v_user_id UUID;
BEGIN
  -- 获取当前用户 ID
  v_user_id := auth.uid();
  
  FOREACH v_photo_id IN ARRAY p_photo_ids
  LOOP
    BEGIN
      -- 获取 Zonerama 图片信息
      SELECT * INTO v_photo FROM public.zonerama_library WHERE id = v_photo_id;
      
      IF v_photo.id IS NOT NULL THEN
        -- 插入到 media_items 表（壁纸库）
        INSERT INTO public.media_items (
          user_id,
          url,
          type,
          status,
          title
        )
        VALUES (
          v_user_id,
          v_photo.url,
          'image',
          'approved', -- 直接设为已审核
          v_photo.title
        );
        
        -- 更新 Zonerama 库状态
        UPDATE public.zonerama_library
        SET 
          status = 'transferred_to_wallpaper',
          transferred_to = 'wallpaper',
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 修复转移到写真库的 RPC 函数
CREATE OR REPLACE FUNCTION public.transfer_zonerama_to_album(
  p_photo_ids UUID[],
  p_target_album_id UUID
)
RETURNS TABLE(success_count INTEGER, error_count INTEGER) AS $$
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
        -- 插入到 album_photos 表（写真库）
        INSERT INTO public.album_photos (
          album_id,
          url,
          level,
          sort_order
        )
        VALUES (
          p_target_album_id,
          v_photo.url,
          'normal', -- 默认普通级
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
$$ LANGUAGE plpgsql SECURITY DEFINER;