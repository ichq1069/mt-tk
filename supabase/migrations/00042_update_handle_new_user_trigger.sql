CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
