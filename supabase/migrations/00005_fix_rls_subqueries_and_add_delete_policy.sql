-- 修复 profiles 表的更新策略中的子查询问题
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()))
  );

-- 修复 media_items 表的更新策略中的子查询问题 (WHERE 子查询中自引用的 BUG)
DROP POLICY IF EXISTS "Users can update their own media (except status)" ON media_items;
CREATE POLICY "Users can update their own media (except status)" ON media_items
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND 
    (status = (SELECT m.status FROM media_items m WHERE m.id = media_items.id))
  );

-- 显式增加 media_items 的删除策略 (通常由管理员或本人删除)
DROP POLICY IF EXISTS "Users can delete their own media" ON media_items;
CREATE POLICY "Users can delete their own media" ON media_items
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to media" ON media_items;
CREATE POLICY "Admins have full access to media" ON media_items
  FOR ALL TO authenticated 
  USING (is_admin(auth.uid()));
