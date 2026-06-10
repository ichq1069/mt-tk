-- Ensure the user_active_sessions table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.user_active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_info JSONB,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS is enabled and policies are correct
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_active_sessions' AND policyname = 'Users can manage their own active sessions') THEN
        CREATE POLICY "Users can manage their own active sessions" ON public.user_active_sessions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_active_sessions' AND policyname = 'Public can view active sessions for check') THEN
        CREATE POLICY "Public can view active sessions for check" ON public.user_active_sessions
            FOR SELECT USING (true);
    END IF;
END $$;

-- Ensure permissions are granted
GRANT ALL ON TABLE public.user_active_sessions TO anon, authenticated, service_role;
