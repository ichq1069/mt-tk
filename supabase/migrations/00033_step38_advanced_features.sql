-- 1. 修复 points_logs 外键关联 (解决报错：Could not find a relationship between 'points_logs' and 'profiles')
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'points_logs_user_id_fkey') THEN
        ALTER TABLE public.points_logs 
        ADD CONSTRAINT points_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. 创建举报投诉表 reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::public.item_status, -- pending, resolved, dismissed
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 开启 RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 举报权限：已登录用户可插入举报，管理员可查看和管理
DROP POLICY IF EXISTS "Authenticated users can report" ON public.reports;
CREATE POLICY "Authenticated users can report" ON public.reports 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins have full access to reports" ON public.reports;
CREATE POLICY "Admins have full access to reports" ON public.reports 
  FOR ALL TO authenticated 
  USING (is_admin(auth.uid()));

-- 3. 扩展 storage_configs 存储水印配置
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_text TEXT DEFAULT '';
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_position TEXT DEFAULT 'bottom-right'; 
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_opacity FLOAT DEFAULT 0.5;
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_layout TEXT DEFAULT 'single'; 
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS watermark_size INT DEFAULT 16;

-- 4. 更新默认权限组，添加去除水印权限点 (默认只有管理员组或特定权限组有)
-- 我们假设当前权限组中包含此字符串表示拥有权限
-- 这里不直接修改已有数据，而是确保前端逻辑中包含此权限点定义

-- 5. 添加待办统计视图或辅助函数 (可选，此处直接由 API 统计更灵活)
