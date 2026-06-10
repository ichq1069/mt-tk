-- 1. 管理员拥有所有权限
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles" ON profiles
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. 允许公开查询基础资料（用于登录校验）
DROP POLICY IF EXISTS "Allow public to lookup profiles" ON profiles;
CREATE POLICY "Allow public to lookup profiles" ON profiles
FOR SELECT TO anon, authenticated
USING (true);

-- 3. 用户可以查看自己的完整资料
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 4. 用户可以更新自己的资料
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
