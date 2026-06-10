
DROP FUNCTION IF EXISTS increment_star_collection(UUID, UUID);

CREATE OR REPLACE FUNCTION increment_star_collection(activity_id_param UUID, user_id_param UUID)
RETURNS TABLE (new_count INTEGER, target_reached BOOLEAN, reward_given BOOLEAN) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    act_record RECORD;
    current_count INTEGER;
    already_rewarded BOOLEAN;
BEGIN
    -- 获取活动配置
    SELECT * INTO act_record FROM star_hunt_activity_configs WHERE id = activity_id_param;
    
    -- 检查是否已经领过奖
    SELECT is_rewarded INTO already_rewarded FROM star_hunt_collection_records 
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
    IF current_count >= act_record.target_count AND (already_rewarded IS NULL OR NOT already_rewarded) THEN
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
        RETURN QUERY SELECT current_count, current_count >= act_record.target_count, COALESCE(already_rewarded, FALSE);
    END IF;
END;
$$;
