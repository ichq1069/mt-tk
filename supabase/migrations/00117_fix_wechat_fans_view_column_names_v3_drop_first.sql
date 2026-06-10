DROP VIEW IF EXISTS wechat_fans_with_users;

-- 创建包含绑定信息的视图
CREATE VIEW wechat_fans_with_users AS
SELECT 
  f.*,
  u.user_id,
  u.subscribe_status as subscribe_status,
  u.unsubscribe_count,
  p.username as platform_username,
  p.avatar_url as profile_avatar_url
FROM wechat_fans f
LEFT JOIN wechat_users u ON f.config_id = u.config_id AND f.openid = u.openid
LEFT JOIN profiles p ON u.user_id = p.id;

-- 授予权限
GRANT SELECT ON wechat_fans_with_users TO authenticated;
GRANT SELECT ON wechat_fans_with_users TO anon;
GRANT SELECT ON wechat_fans_with_users TO service_role;
