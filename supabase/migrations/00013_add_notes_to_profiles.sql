-- 为 profiles 表添加备注字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- 更新 profiles 的策略，允许管理员更新备注
-- 之前的策略 "Admins have full access to profiles" 已经涵盖了这一点
