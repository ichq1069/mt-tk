CREATE TABLE IF NOT EXISTS public.proxy_exclude_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.proxy_exclude_domains ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow admin full access to proxy_exclude_domains" ON public.proxy_exclude_domains
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow public read-only access to proxy_exclude_domains" ON public.proxy_exclude_domains
    FOR SELECT TO public
    USING (is_enabled = true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE proxy_exclude_domains;
