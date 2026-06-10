DROP POLICY IF EXISTS "Admin full access to site_shortcodes" ON site_shortcodes;
CREATE POLICY "Admin full access to site_shortcodes" ON site_shortcodes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));