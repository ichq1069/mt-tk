-- 为 wechat_configs 表添加测试状态字段
ALTER TABLE public.wechat_configs 
ADD COLUMN IF NOT EXISTS test_status TEXT DEFAULT 'untested',
ADD COLUMN IF NOT EXISTS last_test_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS test_message TEXT;

-- 添加注释
COMMENT ON COLUMN public.wechat_configs.test_status IS '测试状态: untested, success, failed';
COMMENT ON COLUMN public.wechat_configs.last_test_time IS '最后测试时间';
COMMENT ON COLUMN public.wechat_configs.test_message IS '测试结果消息';
