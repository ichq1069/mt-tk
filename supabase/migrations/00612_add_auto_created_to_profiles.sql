
-- 1. 在 profiles 表添加 auto_created 字段，标记是否由每日图集自动创建
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_created boolean DEFAULT false;

-- 2. 在 profiles 表添加 auto_created_source 字段，记录创建来源
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_created_source text DEFAULT NULL;

-- 3. 确保 security_status 字段可以标记需要重置密码
-- 该字段已存在，值为 'normal' | 'reset_required' | 'locked'
-- 自动创建的用户默认设为 'reset_required'，表示需要修改密码

-- 4. 创建唯一索引确保用户名不重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
