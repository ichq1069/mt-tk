CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    referrer_id_val uuid;
    group_id_val uuid;
    bind_openid_val text;
    bind_type_val text;
    custom_fields_val jsonb;
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
    
    -- 提取绑定信息和自定义字段
    BEGIN
        custom_fields_val := COALESCE(NEW.raw_user_meta_data->'custom_fields', '{}'::jsonb);
        bind_openid_val := custom_fields_val->>'bind_openid';
        bind_type_val := custom_fields_val->>'bind_type';
    EXCEPTION WHEN others THEN
        custom_fields_val := '{}'::jsonb;
        bind_openid_val := NULL;
        bind_type_val := NULL;
    END;

    -- 如果没有 group_id，默认使用 PT 权限组
    IF group_id_val IS NULL THEN
        SELECT id INTO group_id_val FROM public.permission_groups WHERE name = 'PT' LIMIT 1;
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
        custom_fields,
        points,
        exp,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, split_part(NEW.email, '@', 1)), 
        NEW.email, 
        NEW.raw_user_meta_data->>'avatar_url',
        'user',
        group_id_val,
        referrer_id_val,
        CASE WHEN bind_type_val = 'miniprogram' THEN bind_openid_val ELSE NULL END,
        custom_fields_val,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        mp_openid = CASE WHEN bind_type_val = 'miniprogram' THEN bind_openid_val ELSE profiles.mp_openid END,
        custom_fields = COALESCE(profiles.custom_fields, '{}'::jsonb) || custom_fields_val,
        updated_at = NOW();

    -- 如果存在推荐人，发放邀请奖励给推荐人
    IF referrer_id_val IS NOT NULL THEN
        DECLARE
            v_points int := 10;
            v_exp int := 10;
        BEGIN
            -- 给推荐人加分
            UPDATE public.profiles SET points = COALESCE(points, 0) + v_points, exp = COALESCE(exp, 0) + v_exp WHERE id = referrer_id_val;
            
            -- 记录日志
            INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, v_points, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
            
            INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
            VALUES (referrer_id_val, v_exp, '奖励: 邀请好友注册', 'invite_signup', NEW.id::text)
            ON CONFLICT DO NOTHING;
        EXCEPTION WHEN others THEN
            -- 即使发放失败也不影响注册流程
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
