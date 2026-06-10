-- Drop old version
DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid,text,text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,timestamp with time zone);

-- Recreate with new parameter names and defaults
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    p_user_id uuid DEFAULT NULL,
    p_ip_address text DEFAULT NULL,
    p_browser text DEFAULT NULL,
    p_os text DEFAULT NULL,
    p_network_type text DEFAULT NULL,
    p_page_path text DEFAULT NULL,
    p_duration integer DEFAULT 0,
    p_adblock_enabled boolean DEFAULT false,
    p_device text DEFAULT NULL,
    p_country text DEFAULT NULL,
    p_region text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_referrer text DEFAULT NULL,
    p_resolution text DEFAULT NULL,
    p_language text DEFAULT NULL,
    p_page_title text DEFAULT NULL,
    p_visited_at timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_page_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now())
  )
  ON CONFLICT ON CONSTRAINT user_visit_stats_unique_visit
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(public.user_visit_stats.user_id, EXCLUDED.user_id),
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats TO anon, authenticated;
