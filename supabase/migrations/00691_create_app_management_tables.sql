
-- 1. App配置表
CREATE TABLE public.app_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  app_id text NOT NULL UNIQUE,
  bundle_id text,
  platform text[] DEFAULT '{}',
  description text,
  icon_url text,
  theme_config jsonb DEFAULT '{}',
  feature_flags jsonb DEFAULT '{}',
  api_config jsonb DEFAULT '{}',
  storage_config jsonb DEFAULT '{}',
  ui_config jsonb DEFAULT '{}',
  cfr2_config jsonb DEFAULT '{}',
  custom_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. App版本表
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text NOT NULL REFERENCES public.app_configs(app_id) ON DELETE CASCADE,
  version text NOT NULL,
  version_code integer NOT NULL DEFAULT 1,
  platform text NOT NULL DEFAULT 'android',
  download_url text,
  install_url text,
  release_notes text,
  is_force_update boolean DEFAULT false,
  min_api_version text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(app_id, version, platform)
);

-- 3. App API密钥表
CREATE TABLE public.app_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text NOT NULL REFERENCES public.app_configs(app_id) ON DELETE CASCADE,
  key_name text NOT NULL DEFAULT 'default',
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  secret_key text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  permissions text[] DEFAULT '{}',
  rate_limit integer DEFAULT 1000,
  allowed_origins text[] DEFAULT '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. App使用日志表
CREATE TABLE public.app_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.app_api_keys(id) ON DELETE SET NULL,
  app_id text,
  endpoint text,
  method text,
  ip_address text,
  user_agent text,
  status_code integer,
  response_time_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_configs_updated_at BEFORE UPDATE ON public.app_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_versions_updated_at BEFORE UPDATE ON public.app_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER app_api_keys_updated_at BEFORE UPDATE ON public.app_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. 启用RLS
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_api_logs ENABLE ROW LEVEL SECURITY;

-- 7. 辅助函数：检查是否为管理员
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS策略
-- app_configs
CREATE POLICY "app_configs_select_all" ON public.app_configs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_configs_select_public" ON public.app_configs
  FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "app_configs_admin_all" ON public.app_configs
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- app_versions
CREATE POLICY "app_versions_select_all" ON public.app_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_versions_select_public" ON public.app_versions
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.app_configs WHERE app_id = app_versions.app_id AND is_public = true)
  );
CREATE POLICY "app_versions_admin_all" ON public.app_versions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- app_api_keys (密钥只让管理员看，但Edge Function可以绕过RLS用service_role)
CREATE POLICY "app_api_keys_admin_all" ON public.app_api_keys
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- app_api_logs
CREATE POLICY "app_api_logs_admin_all" ON public.app_api_logs
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 9. 插入默认示例数据
INSERT INTO public.app_configs (app_name, app_id, bundle_id, platform, description, theme_config, feature_flags, api_config, cfr2_config, is_public)
VALUES (
  '图片视频赏析App',
  'pic_video_app',
  'com.example.picvideo',
  ARRAY['android', 'ios', 'web'],
  '图片视频赏析平台默认App配置',
  '{
    "primaryColor": "#6366f1",
    "secondaryColor": "#a855f7",
    "backgroundColor": "#ffffff",
    "darkModeBackground": "#0f172a",
    "fontFamily": "system-ui",
    "borderRadius": "16px"
  }'::jsonb,
  '{
    "enableUpload": true,
    "enableDiscovery": true,
    "enableAlbum": true,
    "enableDailyGallery": true,
    "enablePersonalCenter": true,
    "enableComment": false,
    "enableShare": true,
    "enableDownload": true,
    "enableWatermark": true,
    "enableAds": false,
    "requireLoginForUpload": true,
    "requireAuditForDiscovery": true
  }'::jsonb,
  '{
    "baseUrl": "https://backend.appmiaoda.com",
    "timeout": 30000,
    "retryCount": 3,
    "cdnDomain": "",
    "imageParams": "rs:fit:800:0/q:85",
    "thumbnailParams": "rs:fit:300:0/q:60"
  }'::jsonb,
  '{
    "enabled": true,
    "userId": "",
    "keyId": "",
    "secretKey": "",
    "endpoint": "",
    "customDomain": "",
    "bucketName": "app-media",
    "region": "auto"
  }'::jsonb,
  true
) ON CONFLICT (app_id) DO NOTHING;
