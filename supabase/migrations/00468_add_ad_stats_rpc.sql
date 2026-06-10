-- RPC to get ad statistics
CREATE OR REPLACE FUNCTION public.get_ad_stats()
RETURNS TABLE (
    ad_id uuid,
    event_type text,
    event_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.ad_id, 
        l.event_type, 
        COUNT(*) as event_count
    FROM public.ad_event_logs l
    GROUP BY l.ad_id, l.event_type;
END;
$$;
