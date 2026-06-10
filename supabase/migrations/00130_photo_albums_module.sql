-- 图集写真库分表设计

-- 1. 自定义字段库表
CREATE TABLE IF NOT EXISTS public.album_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'select', 'date', 'multi_tag'
    options JSONB DEFAULT '[]', -- 对于 'select' 类型存储选项列表
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 图集基础信息表
CREATE TABLE IF NOT EXISTS public.photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    album_type TEXT,
    photo_count INTEGER DEFAULT 0,
    download_url TEXT,
    min_permission_group_id UUID REFERENCES public.permission_groups(id), -- 存储最低权限组要求
    description TEXT,
    cover_url TEXT,
    custom_field_values JSONB DEFAULT '{}', -- 存储当前图集的自定义字段值
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 写真图片分表存储 (独立于原有图片表)
CREATE TABLE IF NOT EXISTS public.album_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES public.photo_albums(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    level TEXT DEFAULT 'normal', -- 'normal', 'non_restricted', 'restricted'
    sort_order INTEGER DEFAULT 0,
    custom_field_values JSONB DEFAULT '{}', -- 每张图片也可以有自定义字段
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 分级操作日志
CREATE TABLE IF NOT EXISTS public.album_photo_level_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES public.album_photos(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    old_level TEXT,
    new_level TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS 策略配置

-- 启用 RLS
ALTER TABLE public.album_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photo_level_logs ENABLE ROW LEVEL SECURITY;

-- 自定义字段库: 仅管理员可增删改, 全员读
CREATE POLICY "Admin can full manage fields" ON public.album_custom_fields
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Everyone can view active fields" ON public.album_custom_fields
    FOR SELECT USING (is_active = true);

-- 图集写真集: 根据权限组过滤
-- 先给管理员全权管理权限
CREATE POLICY "Admin can manage albums" ON public.photo_albums
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 用户可见策略 (考虑权限组映射关系)
-- 管理员和对应权限组用户可见图集封面等基本信息 (哪怕无下载权限也可以看到封面置灰)
CREATE POLICY "User can view albums" ON public.photo_albums
    FOR SELECT USING (true);

-- 写真图片: 根据图片分级和用户组权限过滤
CREATE POLICY "Admin can manage album photos" ON public.album_photos
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 不同等级图片的查看策略
-- 普通级全员可见, VIP+ 可见非限制, SVIP+ 可见限制
-- 此处策略需通过 profile 的权限等级判断
CREATE POLICY "User can view normal photos" ON public.album_photos
    FOR SELECT USING (level = 'normal');

-- 注意：非普通级权限过滤逻辑将在应用层进一步强化或后续优化为复杂的 RLS 表达式
-- 基于 prompt， VIP+ 为特定权限组。

-- 记录日志: 仅管理员读写
CREATE POLICY "Admin can access logs" ON public.album_photo_level_logs
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
