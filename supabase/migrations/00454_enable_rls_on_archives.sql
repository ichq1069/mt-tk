
-- Enable RLS on tables where it was disabled
ALTER TABLE public.daily_gallery_posts_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_unlock_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_gallery_access_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonerama_album_configs ENABLE ROW LEVEL SECURITY;

-- Add basic policies (assuming these are for admin use or internal, if they were public without RLS, anyone could read/write)
-- To be safe, let's allow service_role and admins to access them.
-- If they are meant to be public, we can add a SELECT policy for anon.
-- However, the linter just wants RLS enabled.

-- For now, let's just enable RLS. If no policies are added, they are inaccessible via API (except service_role).
-- If the app needs them, I'll add policies. Usually, archives are for admin reference.

CREATE POLICY "Allow admins to select daily_gallery_posts_archive" ON public.daily_gallery_posts_archive FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'));
CREATE POLICY "Allow admins to select ad_unlock_logs_archive" ON public.ad_unlock_logs_archive FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'));
CREATE POLICY "Allow admins to select daily_gallery_access_logs_archive" ON public.daily_gallery_access_logs_archive FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'));
CREATE POLICY "Allow admins to select zonerama_album_configs" ON public.zonerama_album_configs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'));
