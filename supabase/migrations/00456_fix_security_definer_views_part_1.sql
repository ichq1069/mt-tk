
-- Recreate views with security_invoker = true

CREATE OR REPLACE VIEW public.active_announcements WITH (security_invoker = true) AS 
SELECT id, title, content, type, is_active, start_time, end_time, created_at, updated_at
FROM announcements
WHERE is_active = true AND (end_time IS NULL OR end_time > now());

CREATE OR REPLACE VIEW public.public_miniprogram_configs WITH (security_invoker = true) AS 
SELECT id, task_page_path, login_page_path, is_mp_login_enabled, is_mp_bind_enabled, is_debug_enabled
FROM miniprogram_configs;

CREATE OR REPLACE VIEW public.user_daily_read_history WITH (security_invoker = true) AS 
SELECT DISTINCT ON (COALESCE(openid, (user_id)::text, browser_fingerprint), publish_date) 
COALESCE(openid, (user_id)::text, browser_fingerprint) AS user_identifier, 
publish_date, accessed_at
FROM daily_gallery_access_logs
WHERE access_type = 'view'::text
ORDER BY COALESCE(openid, (user_id)::text, browser_fingerprint), publish_date, accessed_at DESC;

CREATE OR REPLACE VIEW public.daily_gallery_access_logs_view WITH (security_invoker = true) AS 
SELECT l.id, l.post_id, l.user_openid, l.user_id, l.ip_address, l.user_agent, l.accessed_at, l.password_used, l.browser_fingerprint, l.publish_date, l.openid, l.access_type, 
p.username AS profile_username, p.avatar_url AS profile_avatar_url, 
f.nickname AS fan_nickname, f.avatar_url AS fan_avatar_url
FROM daily_gallery_access_logs l
LEFT JOIN profiles p ON l.user_id = p.id
LEFT JOIN (
    SELECT DISTINCT ON (wechat_fans.openid) wechat_fans.openid, wechat_fans.nickname, wechat_fans.avatar_url
    FROM wechat_fans
    ORDER BY wechat_fans.openid, wechat_fans.created_at DESC
) f ON l.user_openid = f.openid;

CREATE OR REPLACE VIEW public.user_permissions WITH (security_invoker = true) AS 
SELECT p.id AS user_id, 
COALESCE(g.name, '自定义'::text) AS group_name, 
COALESCE(p.permissions, g.permissions, '[]'::jsonb) AS permissions
FROM profiles p
LEFT JOIN permission_groups g ON p.group_id = g.id;

CREATE OR REPLACE VIEW public.user_referral_network WITH (security_invoker = true) AS 
SELECT p.id AS user_id, p.username, p.avatar_url, p.referrer_id, 
r.username AS referrer_username, 
pg.name AS group_name
FROM profiles p
LEFT JOIN profiles r ON p.referrer_id = r.id
LEFT JOIN permission_groups pg ON p.group_id = pg.id;

CREATE OR REPLACE VIEW public.web_vitals_summary WITH (security_invoker = true) AS 
SELECT metric_name, count(*) AS total_count, avg(metric_value) AS avg_value, 
percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((metric_value)::double precision)) AS p50_value, 
percentile_cont((0.75)::double precision) WITHIN GROUP (ORDER BY ((metric_value)::double precision)) AS p75_value, 
percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((metric_value)::double precision)) AS p95_value, 
count(CASE WHEN (metric_rating = 'good'::text) THEN 1 ELSE NULL::integer END) AS good_count, 
count(CASE WHEN (metric_rating = 'needs-improvement'::text) THEN 1 ELSE NULL::integer END) AS needs_improvement_count, 
count(CASE WHEN (metric_rating = 'poor'::text) THEN 1 ELSE NULL::integer END) AS poor_count, 
round((((count(CASE WHEN (metric_rating = 'good'::text) THEN 1 ELSE NULL::integer END))::numeric / (count(*))::numeric) * (100)::numeric), 2) AS good_percentage
FROM web_vitals_logs
WHERE created_at > (now() - '7 days'::interval)
GROUP BY metric_name;

CREATE OR REPLACE VIEW public.wechat_fans_with_users WITH (security_invoker = true) AS 
SELECT COALESCE(f.id, u.id) AS id, COALESCE(f.config_id, u.config_id) AS config_id, COALESCE(f.openid, u.openid) AS openid, COALESCE(f.nickname, u.nickname) AS nickname, COALESCE(f.avatar_url, u.avatar_url) AS avatar_url, 
f.sex, f.city, f.province, f.country, COALESCE(f.subscribe_time, u.subscribe_time) AS subscribe_time, f.remark, f.groupid, f.tagid_list, f.subscribe_scene, f.qr_scene, f.qr_scene_str, f.last_active_at, 
COALESCE(f.created_at, u.created_at) AS created_at, COALESCE(f.updated_at, u.updated_at) AS updated_at, 
u.user_id, u.subscribe_status, u.unsubscribe_count, 
p.username AS platform_username, p.avatar_url AS profile_avatar_url
FROM wechat_users u
FULL JOIN wechat_fans f ON u.openid = f.openid AND u.config_id = f.config_id
LEFT JOIN profiles p ON u.user_id = p.id;

CREATE OR REPLACE VIEW public.wechat_messages_view WITH (security_invoker = true) AS 
SELECT m.id, m.config_id, m.msg_id, m.from_user, m.to_user, m.msg_type, m.content, m.pic_url, m.media_id, m.event, m.event_key, m.reply_content, m.reply_type, m.replied_at, m.raw_xml, m.created_at, 
c.name AS config_name, 
f.platform_username, f.nickname AS fan_nickname, 
COALESCE(f.platform_username, f.nickname, m.from_user) AS display_nickname
FROM wechat_messages m
LEFT JOIN wechat_configs c ON m.config_id = c.id
LEFT JOIN wechat_fans_with_users f ON m.from_user = f.openid AND m.config_id = f.config_id;
