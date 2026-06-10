CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count int;
BEGIN
    -- 检查 profile 是否已存在
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO user_count FROM public.profiles;

    INSERT INTO public.profiles (id, username, email, role, custom_fields)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'u_' || substr(NEW.id::text, 1, 6)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb)
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
