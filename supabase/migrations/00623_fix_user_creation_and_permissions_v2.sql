-- 1. 确保权限正确
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2. 优化 handle_new_user 触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    referrer_id_val uuid;
    group_id_val uuid;
    bind_openid_val text;
    bind_type_val text;
    custom_fields_val jsonb;
    username_val text;
BEGIN
    -- 从 raw_user_meta_data 提取 referrer_id 和 group_id
    BEGIN
        referrer_id_val := (NEW.raw_user_meta_data->>'referrer_id')::uuid;
    EXCEPTION WHEN others THEN
        referrer_id_val := NULL;
    END;

    BEGIN
        group_id_val := (NEW.raw_user_meta_data->>'group_id')::uuid;
    EXCEPTION WHEN others THEN
        group_id_val := NULL;
    END;
    
    -- 提取绑定信息
    bind_openid_val := COALESCE(
        NEW.raw_user_meta_data->>'bind_openid',
        NEW.raw_user_meta_data->'custom_fields'->>'bind_openid'
    );
    bind_type_val := COALESCE(
        NEW.raw_user_meta_data->>'bind_type',
        NEW.raw_user_meta_data->'custom_fields'->>'bind_type'
    );
    
    custom_fields_val := COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb);
    username_val := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        NEW.email, 
        split_part(NEW.email, '@', 1)
    );

    -- 如果没有 group_id，优先使用 PT 组
    IF group_id_val IS NULL THEN
        SELECT id INTO group_id_val FROM public.permission_groups WHERE name = 'PT' LIMIT 1;
        IF group_id_val IS NULL THEN
            SELECT id INTO group_id_val FROM public.permission_groups WHERE name = '普通用户' LIMIT 1;
        END IF;
    END IF;

    -- 插入 profiles 记录
    INSERT INTO public.profiles (
        id, 
        username, 
        email, 
        avatar_url, 
        role,
        group_id,
        referrer_id,
        mp_openid,
        wechat_openid,
        custom_fields,
        points,
        exp,
        album_level,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        username_val, 
        NEW.email, 
        NEW.raw_user_meta_data->>'avatar_url',
        'pt',
        group_id_val,
        referrer_id_val,
        CASE WHEN bind_type_val = 'miniprogram' THEN bind_openid_val ELSE NULL END,
        CASE WHEN bind_type_val = 'wechat' OR bind_type_val = 'wechat_openid' THEN bind_openid_val ELSE NULL END,
        custom_fields_val,
        0,
        0,
        'pt',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        mp_openid = COALESCE(profiles.mp_openid, EXCLUDED.mp_openid),
        wechat_openid = COALESCE(profiles.wechat_openid, EXCLUDED.wechat_openid),
        custom_fields = COALESCE(profiles.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields,
        role = COALESCE(profiles.role, 'pt'),
        album_level = COALESCE(profiles.album_level, 'pt'),
        updated_at = NOW();

    -- 邀请奖励逻辑
    IF referrer_id_val IS NOT NULL THEN
        BEGIN
            UPDATE public.profiles SET points = COALESCE(points, 0) + 10, exp = COALESCE(exp, 0) + 10 WHERE id = referrer_id_val;
            
            INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, 10, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, 10, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;
