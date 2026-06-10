-- 为 wechat_fans 的 (config_id, openid) 组合添加外键虽然较好，但在 access_logs 里只有 openid
-- 我们先确保 wechat_fans(openid) 有索引，虽然不是唯一的，但 Supabase 支持这种 join (如果不是唯一的会返回数组)
-- 但是，如果我们只想要一个，最好的方式是使用 view

CREATE OR REPLACE VIEW daily_gallery_access_logs_view AS
SELECT 
    l.*,
    p.username AS profile_username,
    p.avatar_url AS profile_avatar_url,
    f.nickname AS fan_nickname,
    f.avatar_url AS fan_avatar_url
FROM daily_gallery_access_logs l
LEFT JOIN profiles p ON l.user_id = p.id
LEFT JOIN (
    SELECT DISTINCT ON (openid) openid, nickname, avatar_url
    FROM wechat_fans
    ORDER BY openid, created_at DESC
) f ON l.user_openid = f.openid;

-- 修改 api.ts 使用这个 view
