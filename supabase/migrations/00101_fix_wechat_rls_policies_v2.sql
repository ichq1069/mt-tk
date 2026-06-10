-- 删除所有旧策略
DROP POLICY IF EXISTS "Admin can full manage wechat_configs" ON public.wechat_configs;
DROP POLICY IF EXISTS "Admin can manage wechat_users" ON public.wechat_users;
DROP POLICY IF EXISTS "Admin can manage wechat_access_tokens" ON public.wechat_access_tokens;
DROP POLICY IF EXISTS "Admin can manage wechat_menus" ON public.wechat_menus;

-- 重新创建策略（使用正确的 auth.uid()）
CREATE POLICY "Admin full access to wechat_configs" ON public.wechat_configs
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin full access to wechat_users" ON public.wechat_users
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin full access to wechat_access_tokens" ON public.wechat_access_tokens
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin full access to wechat_menus" ON public.wechat_menus
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
