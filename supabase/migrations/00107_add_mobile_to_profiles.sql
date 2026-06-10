-- 为 profiles 增加 mobile 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile TEXT UNIQUE;

-- 修改 wechat_users 表，确保 openid 和 config_id 组合唯一，方便 upsert
-- 先检查是否存在该约束，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wechat_users_openid_config_id_key'
    ) THEN
        ALTER TABLE public.wechat_users ADD CONSTRAINT wechat_users_openid_config_id_key UNIQUE (openid, config_id);
    END IF;
END $$;
