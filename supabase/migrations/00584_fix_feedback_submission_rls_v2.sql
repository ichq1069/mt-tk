-- For user_session_recordings
DROP POLICY IF EXISTS "Allow users to insert their own recordings" ON public.user_session_recordings;
DROP POLICY IF EXISTS "Allow admins to view all recordings" ON public.user_session_recordings;
DROP POLICY IF EXISTS "Anyone can insert recordings" ON public.user_session_recordings;
DROP POLICY IF EXISTS "Anyone can select recordings" ON public.user_session_recordings;

CREATE POLICY "Anyone can insert recordings" ON public.user_session_recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select recordings" ON public.user_session_recordings FOR SELECT USING (true);

-- For user_feedbacks
DROP POLICY IF EXISTS "Users can create their own feedbacks" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Users can view their own feedbacks" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Admins can view all feedbacks" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Anyone can select feedbacks" ON public.user_feedbacks;

CREATE POLICY "Anyone can insert feedbacks" ON public.user_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select feedbacks" ON public.user_feedbacks FOR SELECT USING (true);
