-- 1. 重命名旧表以防万一（如果有数据）
ALTER TABLE IF EXISTS public.video_proxy_configs RENAME TO video_proxy_configs_old;

-- 2. 创建正确结构的 video_proxy_configs 表
CREATE TABLE public.video_proxy_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    node_name text NOT NULL,
    node_url text NOT NULL,
    priority integer DEFAULT 0,
    cost_per_gb numeric DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. 开启 RLS
ALTER TABLE public.video_proxy_configs ENABLE ROW LEVEL SECURITY;

-- 4. 创建权限策略
CREATE POLICY "Allow admin full access to video_proxy_configs" 
ON public.video_proxy_configs
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Allow public read access to enabled video_proxy_configs"
ON public.video_proxy_configs
FOR SELECT
TO public
USING (is_enabled = true);
