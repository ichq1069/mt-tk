-- 为 photo_albums 添加缺失字段
ALTER TABLE public.photo_albums 
ADD COLUMN IF NOT EXISTS permission_group_id uuid REFERENCES public.permission_groups(id),
ADD COLUMN IF NOT EXISTS allowed_group_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS apply_switch boolean DEFAULT false;

-- 为 profiles 添加缺失字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS security_status text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank text,
ADD COLUMN IF NOT EXISTS last_session_id text;

-- 为 storage_configs 添加缺失字段
ALTER TABLE public.storage_configs
ADD COLUMN IF NOT EXISTS thumbnail_size integer DEFAULT 1048576;

-- 为 media_items 添加缺失字段
ALTER TABLE public.media_items
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 为 reports 添加缺失字段
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS report_type text;

-- 补充缺失的索引以优化查询
CREATE INDEX IF NOT EXISTS idx_photo_albums_permission_group_id ON public.photo_albums(permission_group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_media_items_status ON public.media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON public.media_items(created_at DESC);
