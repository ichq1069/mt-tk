-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'CONFIG_CHANGE'
    target_table TEXT,
    target_id TEXT,
    payload JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 确保 system_configs 有 description 字段
ALTER TABLE public.system_configs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.system_configs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 启用 RLS
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- 仅管理员可读写日志
CREATE POLICY "Admins can manage logs" ON public.admin_operation_logs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 仅管理员可管理配置
CREATE POLICY "Admins can manage configs" ON public.system_configs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 公开可读部分非敏感配置（如果有）
-- CREATE POLICY "Public read configs" ON public.system_configs FOR SELECT TO authenticated USING (true);

-- 初始配置
INSERT INTO public.system_configs (key, value, description)
VALUES 
('api_rate_limit', '{"window_ms": 60000, "max_requests": 100}', 'API调用频率限制配置'),
('security_policy', '{"jwt_expiry_hours": 24, "max_login_attempts": 5}', '系统安全策略配置')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
