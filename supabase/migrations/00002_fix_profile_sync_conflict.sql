-- 更新 handle_new_user 函数以处理潜在冲突
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
BEGIN
    -- 检查 profile 是否已存在，避免主键冲突
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO user_count FROM public.profiles;

    INSERT INTO public.profiles (id, username, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;
