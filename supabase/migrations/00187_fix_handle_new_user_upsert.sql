CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count int;
  username_val text;
  custom_fields_val jsonb;
BEGIN
  -- 获取当前总用户数（排除当前用户）
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id != NEW.id;
  
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
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    COALESCE(custom_fields_val, '{}'::jsonb),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    mobile = EXCLUDED.mobile,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;