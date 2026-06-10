-- 为 album_photos 表添加 zonerama_photo_id 字段，用于记录 Zonerama 图片 ID，避免重复导入
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS zonerama_photo_id TEXT;

-- 为 zonerama_photo_id 字段创建索引，提升查询性能
CREATE INDEX IF NOT EXISTS idx_album_photos_zonerama_photo_id ON album_photos(zonerama_photo_id);

-- 添加注释
COMMENT ON COLUMN album_photos.zonerama_photo_id IS 'Zonerama 图片 ID，用于避免重复导入';

-- 更新转移到壁纸库的 RPC 函数，同步 zonerama_photo_id
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
        -- 插入前检查是否已存在（根据 zonerama_photo_id）
        IF EXISTS (
            SELECT 1 FROM public.media_items 
            WHERE zonerama_photo_id = v_photo.photo_id 
            AND deleted_at IS NULL
        ) THEN
            -- 更新 Zonerama 库状态为已转移
            UPDATE public.zonerama_library
            SET 
              status = 'transferred_to_wallpaper',
              transferred_to = 'wallpaper',
              transferred_at = NOW(),
              updated_at = NOW()
            WHERE id = v_photo_id;
            
            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 插入到 media_items 表（壁纸库）
        INSERT INTO public.media_items (
          user_id,
          url,
          type,
          status,
          title,
          zonerama_photo_id
        )
        VALUES (
          v_user_id,
          v_photo.url,
          'image',
          'approved', -- 直接设为已审核
          v_photo.title,
          v_photo.photo_id
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

-- 更新转移到写真库的 RPC 函数，同步 level 和 zonerama_photo_id
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
        -- 插入前检查是否已存在（同一图集下同一 photo_id）
        IF EXISTS (
            SELECT 1 FROM public.album_photos 
            WHERE album_id = p_target_album_id 
            AND zonerama_photo_id = v_photo.photo_id
        ) THEN
            -- 更新 Zonerama 库状态
            UPDATE public.zonerama_library
            SET 
              status = 'transferred_to_album',
              transferred_to = 'album',
              transferred_at = NOW(),
              updated_at = NOW()
            WHERE id = v_photo_id;
            
            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 插入到 album_photos 表（写真库）
        INSERT INTO public.album_photos (
          album_id,
          url,
          level,
          sort_order,
          zonerama_photo_id
        )
        VALUES (
          p_target_album_id,
          v_photo.url,
          v_photo.level, -- 同步等级权限
          0,
          v_photo.photo_id
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
