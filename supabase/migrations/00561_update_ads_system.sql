-- Fix missing columns and update structure
ALTER TABLE ads 
  RENAME COLUMN content TO description;
ALTER TABLE ads 
  RENAME COLUMN link TO cta_url;
ALTER TABLE ads 
  RENAME COLUMN display_seconds TO display_duration;
ALTER TABLE ads 
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '了解更多',
  ADD COLUMN IF NOT EXISTS placements TEXT[] DEFAULT '{all}',
  ADD COLUMN IF NOT EXISTS target_levels TEXT[] DEFAULT '{all}',
  ADD COLUMN IF NOT EXISTS frequency_type TEXT DEFAULT 'always';

-- Create events table for statistics
CREATE TABLE IF NOT EXISTS ad_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL, -- 'impression', 'click'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for ad_events
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

-- Policies for ad_events
CREATE POLICY "Anyone can insert ad events" ON ad_events
FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view ad events" ON ad_events
FOR SELECT TO authenticated
USING (can_manage_ads());

-- Update ads policies to support placements array
DROP POLICY IF EXISTS "Anyone can view active ads" ON ads;
CREATE POLICY "Anyone can view active ads" ON ads
FOR SELECT USING (
  is_active = TRUE AND 
  (start_time IS NULL OR start_time <= NOW()) AND 
  (end_time IS NULL OR end_time >= NOW())
);
