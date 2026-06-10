-- 为通知日志添加 msg_id 字段
ALTER TABLE wechat_notification_logs ADD COLUMN IF NOT EXISTS msg_id TEXT;

-- 创建用户订阅状态表
CREATE TABLE IF NOT EXISTS wechat_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES wechat_configs(id),
  openid TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL, -- accept, reject
  popup_scene INTEGER, -- 1: H5, 2: 图文
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, openid, template_id)
);

-- RLS 策略
ALTER TABLE wechat_notification_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to admins" ON wechat_notification_subscriptions FOR ALL TO anon USING (true);

-- 索引提高查询效率
CREATE INDEX IF NOT EXISTS idx_wechat_sub_openid_template ON wechat_notification_subscriptions(openid, template_id);
