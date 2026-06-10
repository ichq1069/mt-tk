-- 确保 is_admin 函数健壮且为 SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新配置 profiles 表的 RLS 策略
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view basic profile info for login" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow anyone to view profile info" ON profiles;

-- 1. 管理员拥有所有权限
CREATE POLICY "Admins have full access to profiles" ON profiles
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. 允许匿名和已登录用户根据用户名/邮箱/ID查询基础信息（用于登录前校验）
-- 注意：这里仅允许选择必要字段，虽然 RLS 作用于行，但在代码中应仅 select 必要列
CREATE POLICY "Allow public to lookup profiles" ON profiles
FOR SELECT TO anon, authenticated
USING (true);

-- 3. 用户可以查看自己的完整资料
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 4. 用户可以更新自己的资料
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 确保 RLS 已开启
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
