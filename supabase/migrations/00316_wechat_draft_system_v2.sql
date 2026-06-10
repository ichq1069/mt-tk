-- 1. 创建微信草稿模板表
CREATE TABLE IF NOT EXISTS public.wechat_draft_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  title text NOT NULL,
  author text,
  digest text,
  content text NOT NULL,
  content_source_url text,
  thumb_media_id text,
  need_open_comment boolean DEFAULT false,
  only_fans_can_comment boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 创建微信草稿记录表（用于记录已推送到微信的草稿）
CREATE TABLE IF NOT EXISTS public.wechat_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  title text NOT NULL,
  author text,
  digest text,
  content text,
  thumb_url text,
  url text,
  create_time timestamptz,
  update_time timestamptz,
  template_id uuid REFERENCES public.wechat_draft_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. 创建微信永久素材表（用于存储上传到微信的图片素材）
CREATE TABLE IF NOT EXISTS public.wechat_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_type text NOT NULL, -- image, voice, video, thumb, news
  url text,
  local_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(config_id, media_id)
);

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_wechat_draft_templates_active ON public.wechat_draft_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_wechat_drafts_config_id ON public.wechat_drafts(config_id);
CREATE INDEX IF NOT EXISTS idx_wechat_drafts_template_id ON public.wechat_drafts(template_id);
CREATE INDEX IF NOT EXISTS idx_wechat_materials_config_id ON public.wechat_materials(config_id);
CREATE INDEX IF NOT EXISTS idx_wechat_materials_local_media_id ON public.wechat_materials(local_media_id);

-- 5. RLS 策略
ALTER TABLE public.wechat_draft_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_materials ENABLE ROW LEVEL SECURITY;

-- 管理员全权限
CREATE POLICY "管理员可管理草稿模板" ON public.wechat_draft_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可管理草稿记录" ON public.wechat_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "管理员可管理微信素材" ON public.wechat_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_wechat_draft_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wechat_draft_templates_updated_at
  BEFORE UPDATE ON public.wechat_draft_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_wechat_draft_templates_updated_at();

CREATE OR REPLACE FUNCTION update_wechat_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wechat_drafts_updated_at
  BEFORE UPDATE ON public.wechat_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_wechat_drafts_updated_at();

-- 刷新 schema 缓存
NOTIFY pgrst, 'reload schema';
