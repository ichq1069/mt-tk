CREATE TABLE IF NOT EXISTS photo_anti_screenshot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  photo_id UUID REFERENCES album_photos(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'screenshot_attempt', 'screen_recording_started', 'window_blur', 'long_press_attempt'
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允许匿名/用户插入日志（仅限前端上报）
ALTER TABLE photo_anti_screenshot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert logs" ON photo_anti_screenshot_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated insert logs" ON photo_anti_screenshot_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view logs" ON photo_anti_screenshot_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
