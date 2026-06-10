-- 1. Create a view for wechat_messages that joins fans and configs properly
CREATE OR REPLACE VIEW wechat_messages_view AS
SELECT 
    m.*,
    c.name as config_name,
    f.platform_username,
    f.nickname as fan_nickname,
    COALESCE(f.platform_username, f.nickname, m.from_user) as display_nickname
FROM wechat_messages m
LEFT JOIN wechat_configs c ON m.config_id = c.id
LEFT JOIN wechat_fans_with_users f ON m.from_user = f.openid AND m.config_id = f.config_id;

GRANT SELECT ON wechat_messages_view TO anon, authenticated;

-- 2. Ensure wechat_fans has a unique index on config_id, openid (already exists)
-- This is just to be safe.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_fans_config_openid ON wechat_fans(config_id, openid);

-- 3. Cleanup wechat_messages with 'unknown' from_user (if any)
-- This is just to be safe.
UPDATE wechat_messages SET from_user = 'unknown_user' WHERE from_user = 'unknown';
