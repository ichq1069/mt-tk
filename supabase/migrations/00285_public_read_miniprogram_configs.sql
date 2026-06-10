-- Allow public (anon) to read non-sensitive fields from miniprogram_configs
CREATE POLICY "Public can read non-sensitive miniprogram configs"
ON public.miniprogram_configs
FOR SELECT
TO public
USING (true);
