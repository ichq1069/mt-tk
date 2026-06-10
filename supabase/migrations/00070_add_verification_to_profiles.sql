ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
-- To sync from auth.users (one-time or through trigger)
UPDATE public.profiles p
SET email_verified = (u.email_confirmed_at IS NOT NULL),
    phone_verified = (u.phone_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE p.id = u.id;
