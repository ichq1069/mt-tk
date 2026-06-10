-- Create ad_event_logs table
CREATE TABLE IF NOT EXISTS public.ad_event_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- 'delivered', 'skipped', 'auto_skipped', 'clicked', 'blocked'
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_event_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (since we need to track even from non-logged in users)
CREATE POLICY "Anyone can insert ad_event_logs" ON public.ad_event_logs 
FOR INSERT WITH CHECK (true);

-- Allow admins to read
CREATE POLICY "Admins can read ad_event_logs" ON public.ad_event_logs 
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ad_event_logs_ad_id ON public.ad_event_logs(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_event_logs_event_type ON public.ad_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_event_logs_created_at ON public.ad_event_logs(created_at);
