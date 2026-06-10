-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bar',
    is_active BOOLEAN NOT NULL DEFAULT true,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT announcements_type_check CHECK (type IN ('bar', 'modal'))
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can do everything
CREATE POLICY "Admins can manage announcements" ON public.announcements
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Everyone can view active announcements
CREATE POLICY "Everyone can view announcements" ON public.announcements
FOR SELECT TO anon, authenticated
USING (true);

-- Create active_announcements view
CREATE OR REPLACE VIEW public.active_announcements AS
SELECT * FROM public.announcements
WHERE is_active = true
AND (end_time IS NULL OR end_time > now())
ORDER BY created_at DESC;

-- Grant permissions on view
GRANT SELECT ON public.active_announcements TO anon, authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
