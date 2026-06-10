-- Create table to track Daily Gallery to Random Beauty triggers
CREATE TABLE IF NOT EXISTS daily_gallery_rb_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  openid TEXT,
  trigger_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trigger_date),
  UNIQUE(openid, trigger_date)
);

-- Add RLS for triggers
ALTER TABLE daily_gallery_rb_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own triggers"
  ON daily_gallery_rb_triggers FOR SELECT
  USING (auth.uid() = user_id OR openid = (SELECT mp_openid FROM profiles WHERE id = auth.uid()) OR openid = (SELECT wechat_openid FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own triggers"
  ON daily_gallery_rb_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id OR openid IS NOT NULL);

-- Update daily_gallery_config default values if needed
-- We do this in the frontend code when saving, but we can ensure the system_configs entry exists
INSERT INTO system_configs (key, value)
VALUES ('daily_gallery_config', '{
  "daily_count": 5,
  "auto_publish": true,
  "publish_time": "00:00",
  "rb_trigger_view_count": 20,
  "rb_trigger_probability": 100,
  "rb_trigger_message": "恭喜发现隐藏惊喜，正在为您加载随机美图..."
}')
ON CONFLICT (key) DO UPDATE SET
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        system_configs.value,
        '{rb_trigger_view_count}',
        COALESCE(system_configs.value->'rb_trigger_view_count', '20'::jsonb)
      ),
      '{rb_trigger_probability}',
      COALESCE(system_configs.value->'rb_trigger_probability', '100'::jsonb)
    ),
    '{rb_trigger_message}',
    COALESCE(system_configs.value->'rb_trigger_message', '"恭喜发现隐藏惊喜，正在为您加载随机美图..."'::jsonb)
  );
