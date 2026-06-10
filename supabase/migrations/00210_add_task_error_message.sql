ALTER TABLE wechat_notification_tasks ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE wechat_notification_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
