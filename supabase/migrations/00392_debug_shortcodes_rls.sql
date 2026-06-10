DROP POLICY IF EXISTS "Admin full access to shortcodes" ON shortcodes;
DROP POLICY IF EXISTS "Public view active shortcodes" ON shortcodes;

CREATE POLICY "Allow all for debug" ON shortcodes
FOR ALL
USING (true);