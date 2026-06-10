-- 1. 禁用所有不安全的策略
DROP POLICY IF EXISTS "User can view albums" ON photo_albums;
DROP POLICY IF EXISTS "User can view normal photos" ON album_photos;
DROP POLICY IF EXISTS "photo_albums_user_select" ON photo_albums;
DROP POLICY IF EXISTS "album_photos_select" ON album_photos;

-- 2. 重建 photo_albums 策略
-- 管理员权限
CREATE POLICY "admin_all_photo_albums" ON photo_albums
FOR ALL TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 普通用户读取权限：只有活跃相册，且属于用户的权限组或具有相册浏览权限
CREATE POLICY "user_select_photo_albums" ON photo_albums
FOR SELECT TO public
USING (
    is_active = true AND (
        -- 如果相册没有限制权限组，或者用户在允许的权限组内
        (permission_group_id IS NULL OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.group_id = photo_albums.permission_group_id
        ))
        -- 或者用户的权限组具备浏览所有相册的权限点
        OR EXISTS (
            SELECT 1 FROM profiles p
            JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() AND g.permissions @> '["album_browse"]'::jsonb
        )
    )
);

-- 3. 重建 album_photos 策略
-- 管理员权限
CREATE POLICY "admin_all_album_photos" ON album_photos
FOR ALL TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 普通用户读取权限
CREATE POLICY "user_select_album_photos" ON album_photos
FOR SELECT TO public
USING (
    -- 必须首先能看到所属相册
    EXISTS (SELECT 1 FROM photo_albums WHERE photo_albums.id = album_photos.album_id)
    AND (
        -- 照片级别权限控制
        level = 'normal' -- 普通级别
        OR (level = 'non_restricted' AND EXISTS ( -- 非限制级：需要 vip 或 svip 权限
            SELECT 1 FROM profiles p
            JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() AND (g.permissions @> '["album_level_vip"]'::jsonb OR g.permissions @> '["album_level_svip"]'::jsonb)
        ))
        OR (level = 'restricted' AND EXISTS ( -- 限制级：需要 svip 权限
            SELECT 1 FROM profiles p
            JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() AND g.permissions @> '["album_level_svip"]'::jsonb
        ))
    )
);
