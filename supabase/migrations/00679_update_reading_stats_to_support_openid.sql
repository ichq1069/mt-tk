CREATE OR REPLACE FUNCTION update_user_reading_stats(
  target_user_id uuid DEFAULT NULL,
  target_openid text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  current_date_beijing date;
  target_profile_id uuid;
BEGIN
  -- 获取北京时间今日日期
  current_date_beijing := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'PRC')::date;

  -- 尝试定位 profile_id
  IF target_user_id IS NOT NULL THEN
    target_profile_id := target_user_id;
  ELSIF target_openid IS NOT NULL THEN
    -- 尝试通过 wechat_openid 或 mp_openid 查找
    SELECT id INTO target_profile_id FROM profiles 
    WHERE wechat_openid = target_openid OR mp_openid = target_openid 
    LIMIT 1;

    -- 如果找不到且有 openid，则创建一个临时 profile
    IF target_profile_id IS NULL THEN
      INSERT INTO profiles (
        username, 
        mp_openid, 
        role, 
        auto_created, 
        auto_created_source
      ) VALUES (
        '访客_' || right(target_openid, 6), 
        target_openid, 
        'pt', 
        true, 
        'daily_gallery_openid'
      ) RETURNING id INTO target_profile_id;
    END IF;
  END IF;

  -- 如果最终定位到了 profile_id，执行统计更新
  IF target_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      total_read_days = COALESCE(total_read_days, 0) + 
        CASE 
          WHEN last_read_date IS NULL OR last_read_date < current_date_beijing THEN 1 
          ELSE 0 
        END,
      continuous_read_days = 
        CASE 
          WHEN last_read_date IS NULL THEN 1
          WHEN last_read_date = current_date_beijing - INTERVAL '1 day' THEN continuous_read_days + 1
          WHEN last_read_date < current_date_beijing - INTERVAL '1 day' THEN 1
          ELSE continuous_read_days -- 今天已经更新过了
        END,
      last_read_date = current_date_beijing,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = target_profile_id 
      AND (last_read_date IS NULL OR last_read_date < current_date_beijing);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
