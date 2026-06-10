
-- Create builds table
CREATE TABLE IF NOT EXISTS public.system_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, building, completed, failed
    download_url TEXT,
    logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_builds ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to system_builds" 
ON public.system_builds 
FOR ALL 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Allow public read if needed? No, admin only.

-- Create bucket for builds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('build-artifacts', 'build-artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for build-artifacts
CREATE POLICY "Admin full access to build-artifacts"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'build-artifacts' AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Public read for build-artifacts"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'build-artifacts');
