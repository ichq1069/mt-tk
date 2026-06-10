-- Add is_debug_enabled to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_debug_enabled BOOLEAN DEFAULT FALSE;

-- Create user_session_recordings table
CREATE TABLE IF NOT EXISTS user_session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT NOT NULL,
    events JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_session_recordings ENABLE ROW LEVEL SECURITY;

-- Policies for user_session_recordings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_session_recordings' AND policyname = 'Allow users to insert their own recordings'
    ) THEN
        CREATE POLICY "Allow users to insert their own recordings" 
        ON user_session_recordings FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_session_recordings' AND policyname = 'Allow admins to view all recordings'
    ) THEN
        CREATE POLICY "Allow admins to view all recordings" 
        ON user_session_recordings FOR SELECT 
        USING (public.is_admin(auth.uid()));
    END IF;
END $$;

-- Add session_id to user_feedbacks if not exists
ALTER TABLE user_feedbacks ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE user_feedbacks ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES user_session_recordings(id);

-- Create a helper function to check if debug is enabled for current user
CREATE OR REPLACE FUNCTION public.is_debug_enabled()
RETURNS BOOLEAN AS $$
  SELECT is_debug_enabled FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
