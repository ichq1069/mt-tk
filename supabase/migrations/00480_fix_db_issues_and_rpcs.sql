-- 1. Create explore_cache_stats table
CREATE TABLE IF NOT EXISTS public.explore_cache_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_count INTEGER DEFAULT 0,
    cached_count INTEGER DEFAULT 0,
    hit_rate DOUBLE PRECISION DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for explore_cache_stats
ALTER TABLE public.explore_cache_stats ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
CREATE POLICY "Allow public read on explore_cache_stats" ON public.explore_cache_stats
FOR SELECT USING (true);

-- Allow admins to manage stats
CREATE POLICY "Admins manage explore_cache_stats" ON public.explore_cache_stats
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Add daily_gallery_status column to media_items if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'daily_gallery_status') THEN
        ALTER TABLE public.media_items ADD COLUMN daily_gallery_status TEXT DEFAULT 'unused';
    END IF;
END $$;

-- 3. Fix upsert_user_visit_stats RPC
-- First drop to change signature if necessary (using dynamic SQL for safety)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE proname = 'upsert_user_visit_stats' AND pg_namespace.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ')';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    p_user_id uuid,
    p_ip_address text,
    p_browser text,
    p_os text,
    p_network_type text,
    p_path text,
    p_duration integer,
    p_adblock_enabled boolean,
    p_device text,  -- Front-end sends 'device'
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
    device_type, -- Table column is 'device_type'
    country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device,      -- Use 'device' parameter
    p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, p_visited_at
  );
END;
$$;

-- 4. Ensure system_configs has zonerama_upload_config
INSERT INTO public.system_configs (key, value)
VALUES ('zonerama_upload_config', '{"photo_api": "", "album_photo_api": "", "url_mode": "url"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value WHERE public.system_configs.value IS NULL OR public.system_configs.value = '{}'::jsonb;

-- 5. Fix/Ensure get_daily_gallery_available_images_rpc
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(
    p_status text,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    status text,
    daily_gallery_status text,
    created_at timestamp with time zone,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
BEGIN
    SELECT count(*) INTO v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'));

    RETURN QUERY
    SELECT 
        m.id, 
        m.url, 
        m.title, 
        m.description, 
        m.status::text, 
        COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
        m.created_at,
        v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 6. Fix/Ensure get_used_daily_gallery_images
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    used_at timestamp with time zone,
    post_date date,
    has_record boolean,
    daily_gallery_status text,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
BEGIN
  SELECT count(*) INTO v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date);

  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    COALESCE(p.created_at, m.created_at) as used_at, 
    COALESCE(m.daily_gallery_date, p.post_date) as post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text,
    v_total
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(m.daily_gallery_date, p.post_date) <= p_end_date)
  ORDER BY COALESCE(m.daily_gallery_date, p.post_date) DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
