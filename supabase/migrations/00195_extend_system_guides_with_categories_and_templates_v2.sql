-- 创建文档分类表
CREATE TABLE IF NOT EXISTS system_guide_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建文档模板表
CREATE TABLE IF NOT EXISTS system_guide_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为现有的文档表添加分类关联和自定义字段存储
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_guides' AND column_name = 'category_id') THEN
        ALTER TABLE system_guides ADD COLUMN category_id UUID REFERENCES system_guide_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_guides' AND column_name = 'custom_fields') THEN
        ALTER TABLE system_guides ADD COLUMN custom_fields JSONB DEFAULT '{}';
    END IF;
END $$;

-- 任何人可读分类 (如果公开)
CREATE POLICY "Anyone can read categories" ON system_guide_categories FOR SELECT USING (true);
-- 任何人可读模板
CREATE POLICY "Anyone can read templates" ON system_guide_templates FOR SELECT USING (true);

-- 管理员可全表操作
CREATE POLICY "Admins can manage categories" ON system_guide_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage templates" ON system_guide_templates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 设置实时复制 (如果需要)
-- ALTER PUBLICATION supabase_realtime ADD TABLE system_guide_categories;
-- ALTER PUBLICATION supabase_realtime ADD TABLE system_guide_templates;
