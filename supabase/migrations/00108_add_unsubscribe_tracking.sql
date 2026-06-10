-- 为 wechat_users 表增加取消关注次数字段
ALTER TABLE public.wechat_users ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0;

-- 为 wechat_users 表增加最后取消关注时间字段
ALTER TABLE public.wechat_users ADD COLUMN IF NOT EXISTS last_unsubscribe_at TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN public.wechat_users.unsubscribe_count IS '取消关注次数，用于识别二次关注用户';
COMMENT ON COLUMN public.wechat_users.last_unsubscribe_at IS '最后一次取消关注的时间';
