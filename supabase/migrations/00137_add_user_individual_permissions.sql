ALTER TABLE profiles ADD COLUMN permissions JSONB DEFAULT '[]';
COMMENT ON COLUMN profiles.permissions IS 'User specific individual permissions, merged with group permissions';
