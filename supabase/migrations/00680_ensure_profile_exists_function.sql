-- 创建一个通用函数，根据 openid 获取或创建 profile
CREATE OR REPLACE FUNCTION ensure_profile_exists(target_openid text, target_nickname text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    found_user_id uuid;
    final_nickname text;
BEGIN
    IF target_openid IS NULL OR target_openid = '' THEN
        RETURN NULL;
    END IF;

    -- 1. 尝试查找已存在的 profile
    SELECT id INTO found_user_id 
    FROM public.profiles 
    WHERE mp_openid = target_openid OR wechat_openid = target_openid
    LIMIT 1;

    -- 2. 如果不存在，则创建一个
    IF found_user_id IS NULL THEN
        final_nickname := COALESCE(target_nickname, '用户_' || substr(target_openid, 1, 8));
        
        INSERT INTO public.profiles (
            username, 
            mp_openid, 
            wechat_openid,
            auto_created,
            auto_created_source
        ) VALUES (
            final_nickname,
            target_openid,
            target_openid, -- 同时填充，因为不确定是哪种
            TRUE,
            'daily_gallery_submission'
        )
        RETURNING id INTO found_user_id;
    END IF;

    RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 迁移数据：为已有的 submissions 填充 user_id (如果 user_id 为空但 openid 存在)
UPDATE public.daily_gallery_submissions
SET user_id = ensure_profile_exists(openid, nickname)
WHERE user_id IS NULL AND openid IS NOT NULL;
