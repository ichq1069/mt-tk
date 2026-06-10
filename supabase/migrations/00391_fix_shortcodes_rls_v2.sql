-- Disable and Re-enable RLS to clear any internal cache/state
ALTER TABLE shortcodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE shortcodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "管理员可全权管理短代码" ON shortcodes;
DROP POLICY IF EXISTS "所有人可读已启用的短代码" ON shortcodes;
DROP POLICY IF EXISTS "Admin full access to shortcodes" ON shortcodes;
DROP POLICY IF EXISTS "Public view active shortcodes" ON shortcodes;

-- Use English names for policies
CREATE POLICY "Admin full access to shortcodes" ON shortcodes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Public view active shortcodes" ON shortcodes
FOR SELECT
TO anon, authenticated
USING (is_active = true);