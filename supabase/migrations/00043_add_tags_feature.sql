CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE media_tags (
  media_id uuid REFERENCES media_items(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;

-- Policies for tags
CREATE POLICY "Anyone can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON tags FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policies for media_tags
CREATE POLICY "Anyone can view media_tags" ON media_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can insert media_tags" ON media_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete media_tags" ON media_tags FOR DELETE TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
