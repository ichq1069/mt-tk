CREATE OR REPLACE FUNCTION update_user_reading_stats(target_user_id UUID)
RETURNS void AS $$
DECLARE
    today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::DATE;
    yesterday DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai') - INTERVAL '1 day')::DATE;
    current_last_read DATE;
    current_continuous INTEGER;
BEGIN
    SELECT last_read_date, continuous_read_days INTO current_last_read, current_continuous
    FROM profiles
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF current_last_read IS NULL THEN
        -- First time reading
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1 
        WHERE user_id = target_user_id;
    ELSIF current_last_read = today THEN
        -- Already updated today, do nothing
        NULL;
    ELSIF current_last_read = yesterday THEN
        -- Read yesterday, increment continuous count
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = current_continuous + 1 
        WHERE user_id = target_user_id;
    ELSE
        -- Break in continuity, reset to 1
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1 
        WHERE user_id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
