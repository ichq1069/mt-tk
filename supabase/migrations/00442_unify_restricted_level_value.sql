-- Update album_user_permissions to use 'restricted' instead of 'vvip'
UPDATE album_user_permissions SET level = 'restricted' WHERE level = 'vvip';

-- Update album_access_requests to use 'restricted' instead of 'vvip'
UPDATE album_access_requests SET approved_level = 'restricted' WHERE approved_level = 'vvip';

-- Ensure all constraints are consistent (already done, but double check)
ALTER TABLE album_user_permissions DROP CONSTRAINT IF EXISTS album_user_permissions_level_check;
ALTER TABLE album_user_permissions ADD CONSTRAINT album_user_permissions_level_check CHECK (level IN ('pt', 'vip', 'svip', 'vvip', 'restricted'));

ALTER TABLE album_access_requests DROP CONSTRAINT IF EXISTS album_access_requests_approved_level_check;
ALTER TABLE album_access_requests ADD CONSTRAINT album_access_requests_approved_level_check CHECK (approved_level IN ('pt', 'vip', 'svip', 'vvip', 'restricted'));
