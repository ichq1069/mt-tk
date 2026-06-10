-- 创建用户访问统计表
CREATE TABLE IF NOT EXISTS public.user_visit_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address text,
    browser text,
    os text,
    network_type text,
    path text,
    duration integer DEFAULT 0,
    adblock_enabled boolean DEFAULT false,
    device_type text,
    country text,
    region text,
    city text,
    referrer text,
    resolution text,
    language text,
    page_title text,
    created_at timestamp with time zone DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.user_visit_stats ENABLE ROW LEVEL SECURITY;

-- 允许管理员查看统计数据
CREATE POLICY "Admins can view visit stats" ON public.user_visit_stats
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 重新创建统计函数以确保它能正确引用新创建的表
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    p_user_id uuid,
    p_ip_address text,
    p_browser text,
    p_os text,
    p_network_type text,
    p_path text,
    p_duration integer,
    p_adblock_enabled boolean,
    p_device text,
    p_country text,
    p_region text,
    p_city text,
    p_referrer text,
    p_resolution text,
    p_language text,
    p_page_title text,
    p_visited_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type,
    country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device,
    p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now())
  );
END;
$$;

-- 授予权限
GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone) TO anon, authenticated, service_role;
