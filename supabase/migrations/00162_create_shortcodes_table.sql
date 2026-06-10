-- 短代码管理表
CREATE TABLE IF NOT EXISTS public.shortcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom', -- 'system' 或 'custom'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入系统预设短代码（占位符逻辑，实际替换在前端或解析器中）
INSERT INTO public.shortcodes (key, value, description, category)
VALUES 
('user.name', '{{user.name}}', '当前登录用户昵称', 'system'),
('date.yyyy-mm-dd', '{{date.yyyy-mm-dd}}', '当前日期 (YYYY-MM-DD)', 'system'),
('site.title', '{{site.title}}', '网站标题', 'system')
ON CONFLICT (key) DO NOTHING;

-- 确保 RLS
ALTER TABLE public.shortcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可读已启用的短代码" ON public.shortcodes FOR SELECT USING (is_active = TRUE);
CREATE POLICY "管理员可全权管理短代码" ON public.shortcodes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
