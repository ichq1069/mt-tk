-- 1. 创建从 auth.users 到 public.profiles 的同步函数
CREATE OR REPLACE FUNCTION public.handle_auth_user_update() 
RETURNS trigger AS $$
BEGIN
  -- 当 auth.users 中的 email 发生变更时，同步更新 public.profiles
  IF (OLD.email IS DISTINCT FROM NEW.email) THEN
    UPDATE public.profiles 
    SET email = NEW.email, updated_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器 (如果不存在)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_update();

-- 2. 创建从 public.profiles 到 auth.users 的同步函数
CREATE OR REPLACE FUNCTION public.handle_profile_email_update()
RETURNS trigger AS $$
BEGIN
  -- 当 public.profiles 中的 email 发生变更时，同步更新 auth.users
  -- 使用 SECURITY DEFINER 确保有权修改 auth 模式下的表
  IF (OLD.email IS DISTINCT FROM NEW.email) THEN
    -- 同步更新 auth.users 的 email
    UPDATE auth.users 
    SET email = NEW.email,
        email_confirmed_at = NOW(), -- 通常资料修改视为已确认
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器 (如果不存在)
DROP TRIGGER IF EXISTS tr_profiles_email_sync_to_auth ON public.profiles;
CREATE TRIGGER tr_profiles_email_sync_to_auth
  AFTER UPDATE ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_profile_email_update();
