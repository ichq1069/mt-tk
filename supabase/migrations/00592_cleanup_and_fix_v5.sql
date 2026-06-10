-- 清理并重建 web_vitals_logs
DROP TABLE IF EXISTS public.web_vitals_logs;
CREATE TABLE public.web_vitals_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    value double precision NOT NULL,
    rating text,
    user_agent text,
    path text,
    session_id text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.web_vitals_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert for web_vitals" ON public.web_vitals_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins to select web_vitals" ON public.web_vitals_logs FOR SELECT USING (true);

-- 清理可能存在的函数冲突
DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid,text,text,text,text,text,integer,boolean,text,text,text,text,text,text,text,text,timestamp with time zone);

-- 重建 upsert_user_visit_stats，确保参数名和类型完全一致
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    p_user_id uuid DEFAULT NULL,
    p_ip_address text DEFAULT NULL,
    p_browser text DEFAULT NULL,
    p_os text DEFAULT NULL,
    p_network_type text DEFAULT NULL,
    p_path text DEFAULT NULL,
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
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now())
  )
  ON CONFLICT (ip_address, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), path, (created_at::date))
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(public.user_visit_stats.user_id, EXCLUDED.user_id),
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats TO anon, authenticated;

-- 更换背景音乐
UPDATE public.storage_configs 
SET bg_music_list = '[{"id":"bgm-02","title":"Lofi Hip Hop","url":"https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Ketsa/Bringing_Home_The_Bacon/Ketsa_-_08_-_Small_Town_Samba.mp3"}]'
WHERE id = (SELECT id FROM public.storage_configs LIMIT 1);

-- 刷新 Schema
NOTIFY pgrst, 'reload schema';