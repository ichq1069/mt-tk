-- 统一 album_access_requests 的级别约束，增加 'restricted'
ALTER TABLE album_access_requests DROP CONSTRAINT IF EXISTS album_access_requests_approved_level_check;
ALTER TABLE album_access_requests ADD CONSTRAINT album_access_requests_approved_level_check 
  CHECK (approved_level = ANY (ARRAY['pt'::text, 'vip'::text, 'svip'::text, 'vvip'::text, 'restricted'::text]));

-- 统一 album_user_permissions 的级别约束，增加 'restricted'
ALTER TABLE album_user_permissions DROP CONSTRAINT IF EXISTS album_user_permissions_level_check;
ALTER TABLE album_user_permissions ADD CONSTRAINT album_user_permissions_level_check 
  CHECK (level = ANY (ARRAY['pt'::text, 'vip'::text, 'svip'::text, 'vvip'::text, 'restricted'::text]));

-- 确保 album_photos 约束也完整
ALTER TABLE album_photos DROP CONSTRAINT IF EXISTS album_photos_level_check;
ALTER TABLE album_photos ADD CONSTRAINT album_photos_level_check 
  CHECK (level = ANY (ARRAY['pending'::text, 'normal'::text, 'vip'::text, 'svip'::text, 'restricted'::text, 'vvip'::text]));
