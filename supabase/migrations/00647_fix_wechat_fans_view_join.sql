CREATE OR REPLACE VIEW public.wechat_fans_with_users AS 
 SELECT COALESCE(f.id, u.id) AS id,
    COALESCE(f.config_id, u.config_id) AS config_id,
    COALESCE(f.openid, u.openid) AS openid,
    COALESCE(f.nickname, u.nickname) AS nickname,
    COALESCE(f.avatar_url, u.avatar_url) AS avatar_url,
    f.sex,
    f.city,
    f.province,
    f.country,
    COALESCE(f.subscribe_time, u.subscribe_time) AS subscribe_time,
    f.remark,
    f.groupid,
    f.tagid_list,
    f.subscribe_scene,
    f.qr_scene,
    f.qr_scene_str,
    f.last_active_at,
    COALESCE(f.created_at, u.created_at) AS created_at,
    COALESCE(f.updated_at, u.updated_at) AS updated_at,
    COALESCE(u.user_id, p.id) AS user_id,
    u.subscribe_status,
    u.unsubscribe_count,
    p.username AS platform_username,
    p.avatar_url AS profile_avatar_url
   FROM wechat_users u
     FULL JOIN wechat_fans f ON u.openid = f.openid AND u.config_id = f.config_id
     LEFT JOIN profiles p ON (u.user_id = p.id OR (COALESCE(f.openid, u.openid) = p.wechat_openid) OR (COALESCE(f.openid, u.openid) = p.mp_openid));
