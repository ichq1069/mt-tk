-- 创建一个 SECURITY DEFINER 函数来安全检查管理员身份，绕过 RLS
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 删除所有已有策略
DROP POLICY IF EXISTS "domain_configs_select_public" ON domain_configs;
DROP POLICY IF EXISTS "domain_configs_select_authenticated" ON domain_configs;
DROP POLICY IF EXISTS "domain_configs_admin_all_v2" ON domain_configs;
DROP POLICY IF EXISTS "domain_configs_admin_all_v3" ON domain_configs;
DROP POLICY IF EXISTS "Public read active domains" ON domain_configs;
DROP POLICY IF EXISTS "Admins full access" ON domain_configs;

-- 允许所有人读取启用的记录 (用于站点识别)
CREATE POLICY "domain_configs_public_read"
ON domain_configs FOR SELECT
TO public
USING (is_active = true);

-- 管理员完全权限 (使用 SECURITY DEFINER 函数确保不受 profiles RLS 影响)
CREATE POLICY "domain_configs_admin_all"
ON domain_configs FOR ALL
TO authenticated
USING (is_admin_safe())
WITH CHECK (is_admin_safe());
