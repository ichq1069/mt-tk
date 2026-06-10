ALTER TABLE public.media_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select for media_views" ON public.media_views;
CREATE POLICY "Allow public select for media_views" ON public.media_views FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for media_views" ON public.media_views;
CREATE POLICY "Allow public insert for media_views" ON public.media_views FOR INSERT WITH CHECK (true);

-- 再次刷新 Schema
NOTIFY pgrst, 'reload schema';