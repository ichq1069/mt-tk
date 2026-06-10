-- 修改 handle_new_user 函数，在插入 profile 时直接设置 group_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_count int;
    default_group_id uuid;
BEGIN
    -- 检查 profile 是否已存在
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- 获取默认权限组 ID
    SELECT id INTO default_group_id FROM public.permission_groups WHERE is_default = true LIMIT 1;

    SELECT COUNT(*) INTO user_count FROM public.profiles;

    INSERT INTO public.profiles (id, username, email, role, custom_fields, group_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'u_' || substr(NEW.id::text, 1, 6)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb),
        default_group_id
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;

-- 删除导致无限循环的旧触发器和函数
DROP TRIGGER IF EXISTS on_profile_created_assign_group ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user_group();
