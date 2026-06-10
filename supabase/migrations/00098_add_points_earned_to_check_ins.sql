-- 为 check_ins 表添加 points_earned 字段
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 10;
