CREATE OR REPLACE FUNCTION upsert_user_active_session(
    p_user_id UUID,
    p_session_id TEXT,
    p_device_info JSONB,
    p_is_active BOOLEAN,
    p_last_ping_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_active_sessions (user_id, session_id, device_info, is_active, last_ping_at)
    VALUES (p_user_id, p_session_id, p_device_info, p_is_active, p_last_ping_at)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        device_info = EXCLUDED.device_info,
        is_active = EXCLUDED.is_active,
        last_ping_at = EXCLUDED.last_ping_at;
        
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
