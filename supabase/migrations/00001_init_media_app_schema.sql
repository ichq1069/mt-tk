-- Enum for roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Enum for item status
CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE,
  role public.user_role DEFAULT 'user'::public.user_role,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Media items table
CREATE TABLE public.media_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  type text CHECK (type IN ('image', 'video')) NOT NULL,
  status public.item_status DEFAULT 'pending'::public.item_status,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Storage configurations (for Cloudflare R2 reference)
CREATE TABLE public.storage_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  key_id text,
  secret_key text,
  endpoint text,
  custom_domain text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- RLS for Media Items
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved media" ON public.media_items
  FOR SELECT USING (status::public.item_status = 'approved'::public.item_status);

CREATE POLICY "Users can view their own media" ON public.media_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON public.media_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media (except status)" ON public.media_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (status IS NOT DISTINCT FROM (SELECT status FROM public.media_items WHERE id = id));

CREATE POLICY "Admins have full access to media" ON public.media_items
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- RLS for Storage Configs
ALTER TABLE public.storage_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to storage_configs" ON public.storage_configs
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Storage Bucket setup
-- NOTE: In local environments, we might need to manually ensure the bucket exists.
-- But using SQL to insert into storage.buckets is standard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media_content', 'media_content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media_content');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media_content');
CREATE POLICY "Users can manage their own objects" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media_content' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins manage all objects" ON storage.objects FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Trigger to sync auth.users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
user_count int;
BEGIN
SELECT COUNT(*) INTO user_count FROM profiles;
INSERT INTO public.profiles (id, username, email, role)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
  NEW.email,
  CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
);
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Also create a trigger for direct INSERT (useful when email confirmation is disabled)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
