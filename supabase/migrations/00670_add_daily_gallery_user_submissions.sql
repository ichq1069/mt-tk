-- Create daily_gallery_submissions table
CREATE TABLE IF NOT EXISTS public.daily_gallery_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.daily_gallery_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions
CREATE POLICY "Users can view their own submissions" 
ON public.daily_gallery_submissions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert their own submissions" 
ON public.daily_gallery_submissions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins have full access to daily_gallery_submissions" 
ON public.daily_gallery_submissions 
FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()));

-- Update daily_gallery_config with upload settings
-- We'll merge with existing config if possible, but for simplicity here we just show what needs to be added
-- The actual update will be done via SQL or through the app code.
-- For now, let's just ensure the table exists and has RLS.

-- Add index for status
CREATE INDEX IF NOT EXISTS idx_daily_gallery_submissions_status ON public.daily_gallery_submissions(status);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_submissions_user_id ON public.daily_gallery_submissions(user_id);
