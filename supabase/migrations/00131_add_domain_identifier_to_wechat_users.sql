ALTER TABLE wechat_users ADD COLUMN IF NOT EXISTS domain_identifier text DEFAULT 'default';
COMMENT ON COLUMN wechat_users.domain_identifier IS '用户注册或首次关注时的来源域名标识';
