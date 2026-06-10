-- 创建 Zonerama 相册配置表
CREATE TABLE IF NOT EXISTS public.zonerama_album_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id TEXT NOT NULL UNIQUE,
  album_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_zonerama_album_configs_album_id ON public.zonerama_album_configs(album_id);
CREATE INDEX IF NOT EXISTS idx_zonerama_album_configs_is_active ON public.zonerama_album_configs(is_active);

-- 添加注释
COMMENT ON TABLE public.zonerama_album_configs IS 'Zonerama 相册配置表，用于保存和管理相册 ID';
COMMENT ON COLUMN public.zonerama_album_configs.album_id IS 'Zonerama 相册 ID';
COMMENT ON COLUMN public.zonerama_album_configs.album_name IS '相册名称';
COMMENT ON COLUMN public.zonerama_album_configs.description IS '相册描述';
COMMENT ON COLUMN public.zonerama_album_configs.is_active IS '是否启用';
COMMENT ON COLUMN public.zonerama_album_configs.last_fetched_at IS '最后获取时间';
COMMENT ON COLUMN public.zonerama_album_configs.photo_count IS '图片数量';