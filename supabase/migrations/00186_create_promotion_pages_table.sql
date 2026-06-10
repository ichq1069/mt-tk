CREATE TABLE promotion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  config JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  short_link TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE promotion_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view published promotion pages" ON promotion_pages
FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all promotion pages" ON promotion_pages
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 允许用户查看自己创建的（冗余但安全）
CREATE POLICY "Users can view their own promotion pages" ON promotion_pages
FOR SELECT TO authenticated
USING (created_by = auth.uid());
