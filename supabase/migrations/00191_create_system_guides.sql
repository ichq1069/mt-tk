CREATE TABLE system_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允许所有人读取公开的说明
ALTER TABLE system_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of public guides" ON system_guides FOR SELECT USING (is_public = true);
CREATE POLICY "Allow admins full access to guides" ON system_guides FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 插入一条默认说明
INSERT INTO system_guides (title, content, is_public) VALUES (
  '用户使用手册', 
  '欢迎使用本平台！\n\n### 1. 浏览内容\n您可以在首页通过瀑布流形式浏览精选的图片和视频内容。\n\n### 2. 收藏与互动\n点击内容可以查看大图，并可以点击收藏按钮保存到您的个人中心。\n\n### 3. 上传作品\n点击底部的上传按钮，您可以分享自己的图片或视频，经过管理员审核后将展示给全站用户。\n\n### 4. 勋章系统\n积极参与互动可以获得精美勋章，在个人中心查看已获得的成就。',
  true
);