-- Add total_read_days column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_read_days INTEGER DEFAULT 0;

-- Update update_user_reading_stats function to also track total read days
CREATE OR REPLACE FUNCTION update_user_reading_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::DATE;
    yesterday DATE := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai') - INTERVAL '1 day')::DATE;
    current_last_read DATE;
    current_continuous INTEGER;
    current_total INTEGER;
BEGIN
    SELECT last_read_date, continuous_read_days, total_read_days 
    INTO current_last_read, current_continuous, current_total
    FROM profiles
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF current_last_read IS NULL THEN
        -- First time reading
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    ELSIF current_last_read = today THEN
        -- Already updated today, do nothing
        NULL;
    ELSIF current_last_read = yesterday THEN
        -- Read yesterday, increment continuous count and total count
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = current_continuous + 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    ELSE
        -- Break in continuity, reset to 1, but increment total
        UPDATE profiles 
        SET last_read_date = today, 
            continuous_read_days = 1,
            total_read_days = COALESCE(current_total, 0) + 1
        WHERE id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
