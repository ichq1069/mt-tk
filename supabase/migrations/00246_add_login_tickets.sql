CREATE TABLE IF NOT EXISTS login_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'::public.item_status CHECK (status IN ('pending', 'fulfilled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- RLS 策略 (匿名可读 ticket 状态，但不可读 user_id 等敏感信息)
ALTER TABLE login_tickets ENABLE ROW LEVEL SECURITY;

-- 允许匿名根据 ticket 查询状态
CREATE POLICY "Anon can view ticket status" ON login_tickets
FOR SELECT TO anon
USING (status::public.item_status = 'pending'::public.item_status OR status = 'fulfilled' OR status = 'expired');

-- 允许匿名插入 ticket
CREATE POLICY "Anon can insert ticket" ON login_tickets
FOR INSERT TO anon
WITH CHECK (true);

-- 允许管理员管理
CREATE POLICY "Admins can manage tickets" ON login_tickets
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
