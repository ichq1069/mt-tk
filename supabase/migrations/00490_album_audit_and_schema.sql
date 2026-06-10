-- Update existing 'user' roles to 'pt'
UPDATE profiles SET role = 'pt' WHERE role = 'user'::user_role;

-- 2. Update photo_albums table
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS apply_switch BOOLEAN DEFAULT FALSE;
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS user_manage_levels TEXT[] DEFAULT ARRAY['pt']::TEXT[];

-- 3. Create photo_album_requests table for auditing access
CREATE TABLE IF NOT EXISTS photo_album_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  status public.item_status DEFAULT 'pending'::public.item_status,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- Enable RLS
ALTER TABLE photo_album_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for photo_album_requests
DROP POLICY IF EXISTS "Users can view their own requests" ON photo_album_requests;
CREATE POLICY "Users can view their own requests" ON photo_album_requests
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own requests" ON photo_album_requests;
CREATE POLICY "Users can create their own requests" ON photo_album_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all requests" ON photo_album_requests;
CREATE POLICY "Admins can manage all requests" ON photo_album_requests
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::user_role)
);
