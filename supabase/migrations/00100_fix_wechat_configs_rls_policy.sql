-- 删除旧策略
DROP POLICY IF EXISTS "Admin can full manage wechat_configs" ON public.wechat_configs;

-- 创建新策略（使用 auth.uid() 而不是 uid()）
CREATE POLICY "Admin can full manage wechat_configs" ON public.wechat_configs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
