-- Add per-user limits to star hunt activities
ALTER TABLE star_hunt_activity_configs 
ADD COLUMN per_user_max_total INTEGER DEFAULT 1,
ADD COLUMN per_user_max_daily INTEGER DEFAULT 1;

-- Create completion tracking table for star hunt
CREATE TABLE IF NOT EXISTS star_hunt_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES star_hunt_activity_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE star_hunt_completions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to star_hunt_completions"
  ON star_hunt_completions FOR SELECT
  USING (true);

CREATE POLICY "Allow system insert to star_hunt_completions"
  ON star_hunt_completions FOR INSERT
  WITH CHECK (true);

-- Index
CREATE INDEX idx_shc_activity_user_date ON star_hunt_completions(activity_id, user_id, completion_date);

-- Update the RPC to handle multiple completions and limits
CREATE OR REPLACE FUNCTION public.increment_star_collection(
    activity_id_param uuid, 
    user_id_param uuid
)
RETURNS TABLE(new_count INTEGER, target_reached BOOLEAN, already_rewarded BOOLEAN) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    act_record RECORD;
    current_count INTEGER;
    v_total_completions INTEGER;
    v_daily_completions INTEGER;
BEGIN
    -- 1. 获取活动配置
    SELECT * INTO act_record FROM public.star_hunt_activity_configs WHERE id = activity_id_param;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. 检查限制
    -- 计算该用户已完成该活动的次数
    SELECT COUNT(*) INTO v_total_completions FROM public.star_hunt_completions 
    WHERE activity_id = activity_id_param AND user_id = user_id_param;
    
    SELECT COUNT(*) INTO v_daily_completions FROM public.star_hunt_completions 
    WHERE activity_id = activity_id_param AND user_id = user_id_param AND completion_date = CURRENT_DATE;

    -- 如果设置了限制且已达到
    IF (COALESCE(act_record.per_user_max_total, 0) > 0 AND v_total_completions >= act_record.per_user_max_total) OR 
       (COALESCE(act_record.per_user_max_daily, 0) > 0 AND v_daily_completions >= act_record.per_user_max_daily) THEN
        -- 返回当前进度，但不允许继续增加
        SELECT collected_count INTO current_count FROM public.star_hunt_collection_records 
        WHERE activity_id = activity_id_param AND user_id = user_id_param;
        RETURN QUERY SELECT COALESCE(current_count, 0), FALSE, TRUE;
        RETURN;
    END IF;

    -- 3. 插入或更新收集记录
    INSERT INTO public.star_hunt_collection_records (activity_id, user_id, collected_count, updated_at, is_rewarded, is_completed)
    VALUES (activity_id_param, user_id_param, 1, NOW(), FALSE, FALSE)
    ON CONFLICT (activity_id, user_id)
    DO UPDATE SET 
        collected_count = star_hunt_collection_records.collected_count + 1,
        updated_at = NOW()
    RETURNING collected_count INTO current_count;
    
    -- 4. 判断是否达到目标
    IF current_count >= act_record.target_count THEN
        -- 记录一次完成
        INSERT INTO public.star_hunt_completions (activity_id, user_id)
        VALUES (activity_id_param, user_id_param);

        -- 发放奖励
        IF act_record.reward_type = 'points' THEN
            PERFORM public.add_user_points_safe(
                user_id_param, 
                (act_record.reward_content->>'amount')::INTEGER, 
                '完成寻找特控⭐活动：' || act_record.name
            );
        END IF;
        
        -- 重置收集记录以便下一次收集 (如果还可以继续)
        -- 这里我们选择将 collected_count 归零
        UPDATE public.star_hunt_collection_records 
        SET collected_count = 0, is_rewarded = FALSE, is_completed = FALSE
        WHERE activity_id = activity_id_param AND user_id = user_id_param;
        
        RETURN QUERY SELECT current_count, TRUE, FALSE;
    ELSE
        RETURN QUERY SELECT current_count, FALSE, FALSE;
    END IF;
END;
$$;
