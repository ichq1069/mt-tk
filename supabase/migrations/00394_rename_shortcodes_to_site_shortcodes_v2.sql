-- 1. Rename table
ALTER TABLE shortcodes RENAME TO site_shortcodes;

-- 2. Update indices (they follow the table usually, but good to check)
-- No need to explicitly rename indices unless we want to be clean.

-- 3. Re-enable RLS on new name
ALTER TABLE site_shortcodes ENABLE ROW LEVEL SECURITY;

-- 4. Re-create policies on new name
DROP POLICY IF EXISTS "Allow all for debug" ON site_shortcodes;
DROP POLICY IF EXISTS "Public view active site_shortcodes" ON site_shortcodes;
DROP POLICY IF EXISTS "Admin full access to site_shortcodes" ON site_shortcodes;

CREATE POLICY "Admin full access to site_shortcodes" ON site_shortcodes
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Public view active site_shortcodes" ON site_shortcodes
FOR SELECT
TO anon, authenticated
USING (is_active = true);