-- 1. Rename column
ALTER TABLE photo_albums RENAME COLUMN min_permission_group_id TO permission_group_id;

-- 2. Update RLS for photo_albums
DROP POLICY IF EXISTS "photo_albums_user_select" ON photo_albums;
CREATE POLICY "photo_albums_user_select" ON photo_albums
FOR SELECT TO PUBLIC USING (
  (is_active = true AND (
    permission_group_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN permission_groups g ON p.group_id = g.id 
      WHERE p.id = auth.uid() AND (
        p.group_id = photo_albums.permission_group_id OR 
        g.permissions @> '["album_browse"]'
      )
    )
  )) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. RLS for album_photos
DROP POLICY IF EXISTS "album_photos_select" ON album_photos;
CREATE POLICY "album_photos_select" ON album_photos
FOR SELECT TO PUBLIC USING (
  EXISTS (
    SELECT 1 FROM photo_albums 
    WHERE id = album_photos.album_id
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Admin policies
DROP POLICY IF EXISTS "photo_albums_admin_all" ON photo_albums;
CREATE POLICY "photo_albums_admin_all" ON photo_albums
FOR ALL TO PUBLIC USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "album_photos_admin_all" ON album_photos;
CREATE POLICY "album_photos_admin_all" ON album_photos
FOR ALL TO PUBLIC USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "album_custom_fields_admin_all" ON album_custom_fields;
CREATE POLICY "album_custom_fields_admin_all" ON album_custom_fields
FOR ALL TO PUBLIC USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "album_custom_fields_select" ON album_custom_fields;
CREATE POLICY "album_custom_fields_select" ON album_custom_fields
FOR SELECT TO PUBLIC USING (true);
