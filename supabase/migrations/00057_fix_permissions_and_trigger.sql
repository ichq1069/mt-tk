-- 确保 permission_groups 存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permission_groups') THEN
        CREATE TABLE public.permission_groups (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name text NOT NULL,
            description text,
            permissions text[] DEFAULT '{}'::text[],
            is_default boolean DEFAULT false,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- 授予基本权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 确保 RLS 不会拦截
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read permission_groups" ON public.permission_groups;
CREATE POLICY "Public read permission_groups" ON public.permission_groups FOR SELECT USING (true);

-- 再次核实 handle_new_user 函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    default_group_id uuid;
    meta_group_id uuid;
    meta_referrer_id uuid;
BEGIN
    -- 检查 profile 是否已存在
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- 获取默认权限组 ID
    SELECT id INTO default_group_id FROM public.permission_groups WHERE is_default = true LIMIT 1;

    -- 从元数据获取可能的 group_id 和 referrer_id
    BEGIN
        meta_group_id := (NEW.raw_user_meta_data->>'group_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        meta_group_id := NULL;
    END;

    BEGIN
        meta_referrer_id := (NEW.raw_user_meta_data->>'referrer_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        meta_referrer_id := NULL;
    END;

    SELECT COUNT(*) INTO user_count FROM public.profiles;

    INSERT INTO public.profiles (id, username, email, role, custom_fields, group_id, referrer_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'u_' || substr(NEW.id::text, 1, 6)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb),
        COALESCE(meta_group_id, default_group_id),
        meta_referrer_id
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;
