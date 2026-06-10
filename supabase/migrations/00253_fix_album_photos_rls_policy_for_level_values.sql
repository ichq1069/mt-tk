-- 删除旧的用户查看策略
DROP POLICY IF EXISTS "user_select_album_photos" ON album_photos;

-- 创建新的用户查看策略,匹配实际的level值(vip/svip/restricted)
CREATE POLICY "user_select_album_photos" ON album_photos
FOR SELECT
USING (
  -- 必须是已激活的图集
  EXISTS (
    SELECT 1 FROM photo_albums
    WHERE photo_albums.id = album_photos.album_id
      AND photo_albums.is_active = true
  )
  AND (
    -- 普通级:所有人可见
    level = 'normal'
    OR
    -- VIP级:vip/svip/vvip权限可见
    (level = 'vip' AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = uid()
          AND profiles.album_level IN ('vip', 'svip', 'vvip')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN permission_groups g ON p.group_id = g.id
        WHERE p.id = uid()
          AND (
            g.permissions @> '["album_level_vip"]'::jsonb
            OR g.permissions @> '["album_level_svip"]'::jsonb
            OR g.permissions @> '["album_level_vvip"]'::jsonb
          )
      )
    ))
    OR
    -- SVIP级:svip/vvip权限可见
    (level = 'svip' AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = uid()
          AND profiles.album_level IN ('svip', 'vvip')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN permission_groups g ON p.group_id = g.id
        WHERE p.id = uid()
          AND (
            g.permissions @> '["album_level_svip"]'::jsonb
            OR g.permissions @> '["album_level_vvip"]'::jsonb
          )
      )
    ))
    OR
    -- 限制级:svip/vvip权限可见(按需求文档)
    (level = 'restricted' AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = uid()
          AND profiles.album_level IN ('svip', 'vvip')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN permission_groups g ON p.group_id = g.id
        WHERE p.id = uid()
          AND (
            g.permissions @> '["album_level_svip"]'::jsonb
            OR g.permissions @> '["album_level_vvip"]'::jsonb
          )
      )
    ))
  )
);