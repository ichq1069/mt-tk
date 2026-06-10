-- RPC to log ad event
CREATE OR REPLACE FUNCTION public.log_ad_event(
    p_ad_id uuid,
    p_event_type text,
    p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO ad_event_logs (ad_id, event_type, user_id)
    VALUES (p_ad_id, p_event_type, COALESCE(p_user_id, auth.uid()));
END;
$$;
