-- Add per-user limits to special passwords table
ALTER TABLE daily_gallery_special_passwords 
ADD COLUMN per_user_max_total INTEGER DEFAULT 0,
ADD COLUMN per_user_max_daily INTEGER DEFAULT 0;

-- Create usage tracking table for special passwords
CREATE TABLE IF NOT EXISTS special_password_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  password_id UUID NOT NULL REFERENCES daily_gallery_special_passwords(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for usage table
ALTER TABLE special_password_usage ENABLE ROW LEVEL SECURITY;

-- Allow reading usage
CREATE POLICY "Allow public read access to special_password_usage"
  ON special_password_usage FOR SELECT
  USING (true);

-- Allow system to insert usage
CREATE POLICY "Allow system insert to special_password_usage"
  ON special_password_usage FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_spu_password_openid_date ON special_password_usage(password_id, openid, usage_date);
CREATE INDEX idx_spu_openid_date ON special_password_usage(openid, usage_date);
