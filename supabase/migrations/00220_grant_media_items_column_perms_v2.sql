-- Ensure anon and authenticated roles have select permission on the table
GRANT SELECT ON public.media_items TO anon, authenticated;

-- Ensure the function is re-created with a slightly different name to force a refresh if the name was cached
-- But better to stick to the name used by the code.
-- Let's just re-grant permissions on the function too.
GRANT EXECUTE ON FUNCTION public.get_random_daily_gallery_images(p_count integer) TO anon, authenticated;
