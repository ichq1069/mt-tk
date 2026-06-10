-- 1. 为配置表增加邀请模式字段
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS invitation_mode_enabled BOOLEAN DEFAULT FALSE;

-- 2. 确保 redemption_codes 表存在且包含必要字段
-- 已经在之前的步骤中检查过，包含 code, type, value, max_uses, used_count, expires_at, created_at, created_by
-- 我们需要确保 type 为 'invite' 的兑换码可以绑定权限组 ID 到 value 字段

-- 3. 创建视图方便查询用户关系
CREATE OR REPLACE VIEW user_referral_network AS
SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.referrer_id,
    r.username AS referrer_username,
    pg.name AS group_name
FROM profiles p
LEFT JOIN profiles r ON p.referrer_id = r.id
LEFT JOIN permission_groups pg ON p.group_id = pg.id;

-- 4. 增加一个函数来获取完整的邀请树数据 (用于关系图)
CREATE OR REPLACE FUNCTION get_user_referral_tree()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(t) INTO result
    FROM (
        SELECT 
            id, 
            username, 
            referrer_id,
            avatar_url,
            (SELECT name FROM permission_groups WHERE id = profiles.group_id) as group_name
        FROM profiles
    ) t;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
