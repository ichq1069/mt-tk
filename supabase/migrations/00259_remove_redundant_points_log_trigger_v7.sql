-- 移除 profiles 表上的冗余积分日志触发器，防止 add_user_points 时产生双重记录
DROP TRIGGER IF EXISTS tr_log_point_changes ON public.profiles;
-- 如果该函数不再被其他地方引用，也可以删除
-- DROP FUNCTION IF EXISTS log_point_changes();
