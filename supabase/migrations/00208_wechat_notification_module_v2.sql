-- 1. 模板管理表
CREATE TABLE IF NOT EXISTS wechat_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES wechat_configs(id) ON DELETE CASCADE,
  pri_tmpl_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  example TEXT,
  type INTEGER, -- 2: 一次性订阅, 3: 长期订阅
  status TEXT DEFAULT 'active', -- 'active' or 'disabled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, pri_tmpl_id)
);

-- 2. 定时通知任务表
CREATE TABLE IF NOT EXISTS wechat_notification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES wechat_configs(id) ON DELETE CASCADE,
  template_id UUID REFERENCES wechat_notification_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_type TEXT DEFAULT 'all', -- 'all', 'fans', 'groups', 'individuals'
  target_ids JSONB, -- 存储选中的用户OpenID列表或组ID
  data JSONB NOT NULL, -- 模板填充数据
  page TEXT, -- 跳转页面
  miniprogram_state TEXT DEFAULT 'formal', -- developer, trial, formal
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'pending'::public.item_status, -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 3. 发送日志表
CREATE TABLE IF NOT EXISTS wechat_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES wechat_configs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES wechat_notification_tasks(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,
  template_id UUID REFERENCES wechat_notification_templates(id) ON DELETE CASCADE,
  status TEXT, -- 'success' or 'failed'
  error_code TEXT,
  error_message TEXT,
  response_data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS 策略
ALTER TABLE wechat_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wechat_notification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wechat_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do everything on wechat_notification_templates" ON wechat_notification_templates;
CREATE POLICY "Admin can do everything on wechat_notification_templates" ON wechat_notification_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can do everything on wechat_notification_tasks" ON wechat_notification_tasks;
CREATE POLICY "Admin can do everything on wechat_notification_tasks" ON wechat_notification_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can do everything on wechat_notification_logs" ON wechat_notification_logs;
CREATE POLICY "Admin can do everything on wechat_notification_logs" ON wechat_notification_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
