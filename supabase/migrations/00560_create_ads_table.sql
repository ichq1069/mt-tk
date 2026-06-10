CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  cta_text TEXT DEFAULT '了解更多',
  cta_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('splash', 'popup', 'in-feed')),
  placement TEXT NOT NULL, -- 'all', 'discovery', 'daily', 'albums'
  display_duration INTEGER DEFAULT 5,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  owner_id UUID DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Helper function for policies
CREATE OR REPLACE FUNCTION can_manage_ads()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY "Anyone can view active ads" ON ads
FOR SELECT USING (
  is_active = TRUE AND 
  (start_time IS NULL OR start_time <= NOW()) AND 
  (end_time IS NULL OR end_time >= NOW())
);

CREATE POLICY "Admins can do everything on ads" ON ads
FOR ALL TO authenticated
USING (can_manage_ads())
WITH CHECK (can_manage_ads());
