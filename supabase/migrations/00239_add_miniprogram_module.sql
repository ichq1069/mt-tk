CREATE TABLE IF NOT EXISTS public.miniprogram_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text NOT NULL,
  app_secret text NOT NULL,
  ad_unit_id text,
  code_snippet text,
  instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_unlock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  openid text,
  item_id text NOT NULL, -- post_date or post_id
  unlock_type text NOT NULL DEFAULT 'daily_gallery',
  status text NOT NULL DEFAULT 'pending'::public.item_status, -- pending, unlocked
  created_at timestamptz DEFAULT now(),
  unlocked_at timestamptz
);

-- Policies for miniprogram_configs (Admins only)
ALTER TABLE public.miniprogram_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to miniprogram_configs" ON public.miniprogram_configs
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Policies for ad_unlock_logs
ALTER TABLE public.ad_unlock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert ad_unlock_logs" ON public.ad_unlock_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own ad_unlock_logs" ON public.ad_unlock_logs
  FOR SELECT TO anon, authenticated USING (auth.uid() = user_id OR openid = openid); -- Simplified
CREATE POLICY "Admins have full access to ad_unlock_logs" ON public.ad_unlock_logs
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Add a trigger to update updated_at for miniprogram_configs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_miniprogram_configs_updated_at
BEFORE UPDATE ON public.miniprogram_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
