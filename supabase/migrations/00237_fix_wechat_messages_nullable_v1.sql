ALTER TABLE public.wechat_messages ALTER COLUMN from_user DROP NOT NULL;
ALTER TABLE public.wechat_messages ALTER COLUMN to_user DROP NOT NULL;

-- 清理历史数据中的 unknown_user
UPDATE public.wechat_messages SET from_user = NULL WHERE from_user = 'unknown_user';
UPDATE public.wechat_messages SET to_user = NULL WHERE to_user = 'unknown_user';
