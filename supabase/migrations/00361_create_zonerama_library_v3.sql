-- 创建 Zonerama 库表
CREATE TABLE IF NOT EXISTS public.zonerama_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pending'::public.item_status CHECK (status IN ('pending', 'transferred_to_wallpaper', 'transferred_to_album')),
  transferred_to TEXT, -- 'wallpaper' 或 'album'
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, photo_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_zonerama_library_album_id ON public.zonerama_library(album_id);
CREATE INDEX IF NOT EXISTS idx_zonerama_library_status ON public.zonerama_library(status);
CREATE INDEX IF NOT EXISTS idx_zonerama_library_created_at ON public.zonerama_library(created_at DESC);

-- 添加注释
COMMENT ON TABLE public.zonerama_library IS 'Zonerama 图片库，用于存储从 Zonerama 获取的图片数据';
COMMENT ON COLUMN public.zonerama_library.album_id IS 'Zonerama 相册 ID';
COMMENT ON COLUMN public.zonerama_library.photo_id IS 'Zonerama 图片 ID';
COMMENT ON COLUMN public.zonerama_library.url IS '图片 URL（已应用代理）';
COMMENT ON COLUMN public.zonerama_library.status IS '状态：pending-待处理, transferred_to_wallpaper-已转到壁纸库, transferred_to_album-已转到写真库';
COMMENT ON COLUMN public.zonerama_library.transferred_to IS '转移目标：wallpaper-壁纸库, album-写真库';

-- RLS 策略：仅管理员可访问
ALTER TABLE public.zonerama_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可查看 Zonerama 库"
  ON public.zonerama_library
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "管理员可插入 Zonerama 库"
  ON public.zonerama_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "管理员可更新 Zonerama 库"
  ON public.zonerama_library
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "管理员可删除 Zonerama 库"
  ON public.zonerama_library
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 创建批量插入 RPC 函数
CREATE OR REPLACE FUNCTION public.batch_insert_zonerama_photos(
  p_album_id TEXT,
  p_photos JSONB
)
RETURNS TABLE(inserted_count INTEGER, skipped_count INTEGER) AS $$
DECLARE
  v_inserted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_photo JSONB;
BEGIN
  FOR v_photo IN SELECT * FROM jsonb_array_elements(p_photos)
  LOOP
    BEGIN
      INSERT INTO public.zonerama_library (album_id, photo_id, url, title)
      VALUES (
        p_album_id,
        v_photo->>'photo_id',
        v_photo->>'url',
        v_photo->>'title'
      )
      ON CONFLICT (album_id, photo_id) DO NOTHING;
      
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建转移到壁纸库的 RPC 函数
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
        -- 插入到 media 表（壁纸库）
        INSERT INTO public.media (
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

-- 创建转移到写真库的 RPC 函数
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
          image_url,
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