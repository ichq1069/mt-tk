-- 1. 修复 profiles 的 RLS 策略，确保更新检查正确，不带多行结果的风险
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid() LIMIT 1))
  );

-- 2. 修复 media_items 的更新逻辑，支持用户修改后的重新审核流程
DROP POLICY IF EXISTS "Users can update their own media (except status)" ON media_items;
CREATE POLICY "Users can update their own media (except status)" ON media_items
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND 
    (
      -- 允许用户修改标题/URL，只要状态没变，或者显式改回待审核状态
      (status = (SELECT m.status FROM media_items m WHERE m.id = media_items.id LIMIT 1)) OR 
      status::public.item_status = 'pending'::public.item_status
    )
  );

-- 3. 确认为管理员提供完全覆盖的权限，防止冲突
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to media" ON media_items;
CREATE POLICY "Admins have full access to media" ON media_items
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to storage_configs" ON storage_configs;
CREATE POLICY "Admins have full access to storage_configs" ON storage_configs
  FOR ALL TO authenticated USING (is_admin(auth.uid()));
