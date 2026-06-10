-- 为 wechat_fans 增加 config_id 和 openid 组合的唯一约束（如果还没有）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wechat_fans_config_id_openid_key'
    ) THEN
        ALTER TABLE public.wechat_fans ADD CONSTRAINT wechat_fans_config_id_openid_key UNIQUE (config_id, openid);
    END IF;
END $$;

-- 在 wechat_users 表中增加对 wechat_fans 的外键参考 (基于业务，实际上是 user_id 更重要)
-- 这里的逻辑是：一个 wechat_user 记录对应一个 wechat_fan（基础信息）
-- 但通常 wechat_fans 是全量，wechat_users 是核心业务表。

-- 我们在 api.ts 里查询 wechat_fans 的时候关联 wechat_users。
