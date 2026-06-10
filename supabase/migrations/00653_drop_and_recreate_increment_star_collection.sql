DROP FUNCTION IF EXISTS increment_star_collection(uuid, uuid);
DROP FUNCTION IF EXISTS increment_star_collection(uuid, uuid, text);

-- Recreate the first version
CREATE OR REPLACE FUNCTION increment_star_collection(activity_id_param uuid, user_id_param uuid)
RETURNS TABLE(new_count integer, target_reached boolean, already_rewarded boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    act_record RECORD;
    current_count INTEGER;
    v_already_rewarded BOOLEAN;
BEGIN
    -- 获取活动配置
    SELECT * INTO act_record FROM star_hunt_activity_configs WHERE id = activity_id_param;
    
    -- 检查是否已经领过奖
    SELECT is_rewarded INTO v_already_rewarded FROM star_hunt_collection_records 
    WHERE activity_id = activity_id_param AND user_id = user_id_param;
    
    -- 插入或更新记录
    INSERT INTO star_hunt_collection_records (activity_id, user_id, collected_count, updated_at)
    VALUES (activity_id_param, user_id_param, 1, NOW())
    ON CONFLICT (activity_id, user_id)
    DO UPDATE SET 
        collected_count = star_hunt_collection_records.collected_count + 1,
        updated_at = NOW()
    RETURNING collected_count INTO current_count;
    
    -- 判断是否达到目标且未领过奖
    IF current_count >= act_record.target_count AND (v_already_rewarded IS NULL OR NOT v_already_rewarded) THEN
        -- 发放积分奖励 (如果类型是 points)
        IF act_record.reward_type = 'points' THEN
            PERFORM add_user_points_safe(
                user_id_param, 
                (act_record.reward_content->>'amount')::INTEGER, 
                '完成寻找特控⭐活动：' || act_record.name
            );
        END IF;
        
        -- 更新领奖状态
        UPDATE star_hunt_collection_records 
        SET is_rewarded = TRUE 
        WHERE activity_id = activity_id_param AND user_id = user_id_param;
        
        RETURN QUERY SELECT current_count, TRUE, TRUE;
    ELSE
        RETURN QUERY SELECT current_count, current_count >= act_record.target_count, COALESCE(v_already_rewarded, FALSE);
    END IF;
END;
$$;

-- Recreate the second version
CREATE OR REPLACE FUNCTION public.increment_star_collection(p_user_id uuid, p_activity_id uuid, p_page_path text DEFAULT '')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_config RECORD;
    v_record RECORD;
    v_new_count INTEGER;
    v_is_completed BOOLEAN := false;
    v_completed_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. 获取活动配置
    SELECT * INTO v_config FROM star_hunt_activity_configs WHERE id = p_activity_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '活动不存在或已结束');
    END IF;

    -- 2. 获取或创建用户记录
    INSERT INTO star_hunt_collection_records (user_id, activity_id)
    VALUES (p_user_id, p_activity_id)
    ON CONFLICT (user_id, activity_id) DO NOTHING;

    SELECT * INTO v_record FROM star_hunt_collection_records WHERE user_id = p_user_id AND activity_id = p_activity_id;

    -- 3. 检查是否已完成
    IF v_record.is_completed THEN
        RETURN jsonb_build_object('success', true, 'message', '已完成收集', 'data', v_record);
    END IF;

    -- 4. 增加数量
    v_new_count := v_record.collected_count + 1;
    IF v_new_count >= v_config.target_count THEN
        v_is_completed := true;
        v_completed_at := now();
    END IF;

    -- 5. 更新记录
    UPDATE star_hunt_collection_records
    SET 
        collected_count = v_new_count,
        collection_history = COALESCE(collection_history, '[]'::jsonb) || jsonb_build_object('time', now(), 'page', p_page_path),
        is_completed = v_is_completed,
        completed_at = v_completed_at,
        updated_at = now()
    WHERE id = v_record.id;

    -- 6. 如果完成且奖励是积分，自动发放
    IF v_is_completed AND v_config.reward_type = 'points' THEN
        PERFORM add_user_points_safe(p_user_id, (v_config.reward_content->>'amount')::INTEGER, '特控⭐挑战奖励');
        UPDATE star_hunt_collection_records SET is_rewarded = true WHERE id = v_record.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'data', jsonb_build_object(
            'collected_count', v_new_count,
            'target_count', v_config.target_count,
            'is_completed', v_is_completed
        )
    );
END;
$function$;