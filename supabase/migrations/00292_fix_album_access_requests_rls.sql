-- 确保 RLS 开启
ALTER TABLE public.album_access_requests ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能插入自己的申请
DROP POLICY IF EXISTS "Users can submit access requests" ON album_access_requests;
CREATE POLICY "Users can submit access requests" ON album_access_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 策略：用户只能查看自己的申请
DROP POLICY IF EXISTS "Users can view their own requests" ON album_access_requests;
CREATE POLICY "Users can view their own requests" ON album_access_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 策略：管理员具有全部权限
DROP POLICY IF EXISTS "Admins have full access to requests" ON album_access_requests;
CREATE POLICY "Admins have full access to requests" ON album_access_requests
    FOR ALL TO authenticated USING (is_admin(auth.uid()));
