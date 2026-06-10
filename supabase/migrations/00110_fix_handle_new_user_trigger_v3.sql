-- 更新 handle_new_user 触发器，支持自定义字段同步和 mobile 字段同步
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  username_val text;
  custom_fields_val jsonb;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- 从 raw_user_meta_data 中提取信息
  username_val := NEW.raw_user_meta_data->>'username';
  custom_fields_val := (NEW.raw_user_meta_data->>'custom_fields')::jsonb;
  
  -- 如果 username 为空（例如通过第三方登录或 Magic Link），使用 email 的前缀或 phone
  IF username_val IS NULL THEN
    IF NEW.email IS NOT NULL THEN
      username_val := split_part(NEW.email, '@', 1);
    ELSE
      username_val := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    mobile, 
    role, 
    custom_fields,
    avatar_url
  )
  VALUES (
    NEW.id,
    username_val,
    NEW.email,
    NEW.phone, -- 将 auth.users.phone 同步到 profiles.mobile
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    COALESCE(custom_fields_val, '{}'::jsonb),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN NEW;
END;
$$;

-- 确保触发器存在
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 如果是立即确认的注册（免验证），也要触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();
