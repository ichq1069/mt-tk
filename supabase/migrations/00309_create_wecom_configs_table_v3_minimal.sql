-- 创建企业微信配置表
CREATE TABLE IF NOT EXISTS public.wecom_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  corp_id TEXT NOT NULL,
  agent_id INTEGER NOT NULL,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 开启 RLS
ALTER TABLE public.wecom_configs ENABLE ROW LEVEL SECURITY;

-- 允许管理员管理配置
CREATE POLICY "Admins can manage wecom configs"
ON public.wecom_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 允许 service_role 读取配置
CREATE POLICY "Service role can read wecom configs"
ON public.wecom_configs
FOR SELECT
TO service_role
USING (true);
