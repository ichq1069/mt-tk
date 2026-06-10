-- 创建一个供管理员使用的用户列表视图，包含最后在线时间
CREATE OR REPLACE VIEW admin_user_list_view AS
SELECT 
    p.*,
    u.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- 授予视图权限（虽然 RLS 还会生效，但至少结构可查）
GRANT SELECT ON admin_user_list_view TO authenticated;
GRANT SELECT ON admin_user_list_view TO service_role;
