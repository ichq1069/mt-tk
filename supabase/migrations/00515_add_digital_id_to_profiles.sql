ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digital_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_digital_id_key ON public.profiles (digital_id);