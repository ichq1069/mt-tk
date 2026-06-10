-- Create web_vitals_logs table if not exists
CREATE TABLE IF NOT EXISTS public.web_vitals_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    rating TEXT,
    user_agent TEXT,
    path TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_vitals_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for anonymous users reporting performance)
CREATE POLICY "Allow anonymous insert for web_vitals_logs" 
ON public.web_vitals_logs FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to select
CREATE POLICY "Allow authenticated users to select web_vitals_logs" 
ON public.web_vitals_logs FOR SELECT 
TO authenticated 
USING (true);

-- Create RPC for cache stats
CREATE OR REPLACE FUNCTION public.get_all_cache_stats()
RETURNS TABLE (
    cache_key TEXT,
    hit_count INTEGER,
    miss_count INTEGER,
    last_hit_at TIMESTAMPTZ,
    last_miss_at TIMESTAMPTZ,
    hit_rate DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.cache_key,
        cs.hit_count,
        cs.miss_count,
        cs.last_hit_at,
        cs.last_miss_at,
        CASE 
            WHEN (cs.hit_count + cs.miss_count) = 0 THEN 0.0
            ELSE (cs.hit_count::DOUBLE PRECISION / (cs.hit_count + cs.miss_count)) * 100
        END as hit_rate
    FROM 
        public.cache_stats cs
    ORDER BY 
        cs.hit_count DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_cache_stats() TO authenticated;
GRANT ALL ON TABLE public.web_vitals_logs TO authenticated;
GRANT INSERT ON TABLE public.web_vitals_logs TO anon;
