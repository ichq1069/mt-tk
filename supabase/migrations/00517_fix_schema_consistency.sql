-- 修复 photo_albums 表
ALTER TABLE public.photo_albums 
ADD COLUMN IF NOT EXISTS permission_group_id uuid REFERENCES public.permission_groups(id),
ADD COLUMN IF NOT EXISTS allowed_group_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS apply_switch boolean DEFAULT false;

-- 修复 profiles 表
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS security_status text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank text,
ADD COLUMN IF NOT EXISTS last_session_id text;

-- 修复 storage_configs 表
ALTER TABLE public.storage_configs
ADD COLUMN IF NOT EXISTS thumbnail_size integer DEFAULT 1048576;

-- 修复 media_items 表
ALTER TABLE public.media_items
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 修复 reports 表
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS report_type text;

-- 修复 check_ins 表
ALTER TABLE public.check_ins 
ADD COLUMN IF NOT EXISTS continuous_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- 修复 redemption_codes 表
ALTER TABLE public.redemption_codes
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 优化索引
CREATE INDEX IF NOT EXISTS idx_photo_albums_permission_group_id ON public.photo_albums(permission_group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_media_items_status ON public.media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON public.media_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id_date ON public.check_ins(user_id, check_in_date);
