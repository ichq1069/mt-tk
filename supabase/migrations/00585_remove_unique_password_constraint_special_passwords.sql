-- 移除特殊密码表中错误的全局唯一索引，改用日期+密码的索引（或仅保留已有的复合索引）
ALTER TABLE public.daily_gallery_special_passwords DROP CONSTRAINT IF EXISTS daily_gallery_special_passwords_password_key;
DROP INDEX IF EXISTS public.daily_gallery_special_passwords_password_key;

-- 增加一个非唯一的密码索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_special_passwords_password_target ON public.daily_gallery_special_passwords(password, target_date);
