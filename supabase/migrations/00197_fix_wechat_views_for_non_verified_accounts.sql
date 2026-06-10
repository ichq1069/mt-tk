-- 更新 wechat_fans_with_users 视图，使其包含所有微信用户（包括非认证公众号用户）
CREATE OR REPLACE VIEW wechat_fans_with_users AS
SELECT 
    COALESCE(f.id, u.id) as id,
    COALESCE(f.config_id, u.config_id) as config_id,
    COALESCE(f.openid, u.openid) as openid,
    COALESCE(f.nickname, u.nickname) as nickname,
    COALESCE(f.avatar_url, u.avatar_url) as avatar_url,
    f.sex,
    f.city,
    f.province,
    f.country,
    COALESCE(f.subscribe_time, u.subscribe_time) as subscribe_time,
    f.remark,
    f.groupid,
    f.tagid_list,
    f.subscribe_scene,
    f.qr_scene,
    f.qr_scene_str,
    f.last_active_at,
    COALESCE(f.created_at, u.created_at) as created_at,
    COALESCE(f.updated_at, u.updated_at) as updated_at,
    u.user_id,
    u.subscribe_status,
    u.unsubscribe_count,
    p.username AS platform_username,
    p.avatar_url AS profile_avatar_url
FROM wechat_users u
FULL JOIN wechat_fans f ON u.openid = f.openid AND u.config_id = f.config_id
LEFT JOIN profiles p ON u.user_id = p.id;

-- 重新创建 wechat_messages_view 以确保其依赖关系正确
CREATE OR REPLACE VIEW wechat_messages_view AS
SELECT 
    m.id,
    m.config_id,
    m.msg_id,
    m.from_user,
    m.to_user,
    m.msg_type,
    m.content,
    m.pic_url,
    m.media_id,
    m.event,
    m.event_key,
    m.reply_content,
    m.reply_type,
    m.replied_at,
    m.raw_xml,
    m.created_at,
    c.name AS config_name,
    f.platform_username,
    f.nickname AS fan_nickname,
    COALESCE(f.platform_username, f.nickname, m.from_user) AS display_nickname
FROM wechat_messages m
LEFT JOIN wechat_configs c ON m.config_id = c.id
LEFT JOIN wechat_fans_with_users f ON m.from_user = f.openid AND m.config_id = f.config_id;
