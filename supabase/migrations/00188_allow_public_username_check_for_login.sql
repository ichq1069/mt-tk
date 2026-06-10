-- 允许未登录用户按用户名查 profile，用于登录逻辑
CREATE POLICY "Public can view basic profile info for login"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true); -- 这里可以限制字段，但 RLS 本身是对行的。我们只需确保行可见。
