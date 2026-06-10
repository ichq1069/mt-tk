-- 1. 确保基础类型存在
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
        CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'rejected', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM ('audit', 'system', 'admin');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 修复 profiles 表
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- 3. 修复 media_items 表 (确保字段与 api.ts 一致)
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 4. 确保 storage_configs 有基础数据
INSERT INTO public.storage_configs (site_title, force_login, wechat_only, wechat_forbidden)
SELECT '图片视频赏析', false, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.storage_configs);

-- 5. 补充缺失的表：收藏、不喜欢、标注、通知、签到
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_id uuid REFERENCES public.media_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, media_id)
);

CREATE TABLE IF NOT EXISTS public.dislikes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_id uuid REFERENCES public.media_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, media_id)
);

CREATE TABLE IF NOT EXISTS public.annotations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_id uuid REFERENCES public.media_items(id) ON DELETE CASCADE NOT NULL,
  x float8 NOT NULL,
  y float8 NOT NULL,
  text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type public.notification_type DEFAULT 'system'::public.notification_type,
  link text,
  link_type text DEFAULT 'internal',
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in_date date DEFAULT current_date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, check_in_date)
);

-- 6. 设置 RLS 策略 (简化版，确保基础访问)
ALTER TABLE public.storage_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON storage_configs;
CREATE POLICY "Public Read" ON storage_configs FOR SELECT USING (true);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Approved" ON media_items;
CREATE POLICY "Public View Approved" ON media_items FOR SELECT USING (status::public.item_status = 'approved'::public.item_status);
DROP POLICY IF EXISTS "Users View Own" ON media_items;
CREATE POLICY "Users View Own" ON media_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
