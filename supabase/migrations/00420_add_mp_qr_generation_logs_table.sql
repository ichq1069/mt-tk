-- 创建小程序码生成日志表
CREATE TABLE IF NOT EXISTS public.mp_qr_generation_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    ticket text,
    scene text,
    page text,
    log_type text DEFAULT 'scancode',
    success boolean DEFAULT true,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

-- 设置权限
ALTER TABLE public.mp_qr_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can do everything on mp_qr_generation_logs" ON public.mp_qr_generation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin read all mp_qr_generation_logs" ON public.mp_qr_generation_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 更新 mp_login_logs 的注释或说明，明确其用途为实际登录流水
COMMENT ON TABLE public.mp_login_logs IS '小程序实际登录/绑定操作流水（成功或失败）';
COMMENT ON TABLE public.mp_qr_generation_logs IS '小程序码生成记录流水（包含页面、参数等）';

-- 开启实时复制 (可选，用于后台实时查看日志)
ALTER PUBLICATION supabase_realtime ADD TABLE mp_qr_generation_logs;
