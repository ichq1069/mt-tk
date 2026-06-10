-- Add advanced advertising settings
ALTER TABLE ads 
  ADD COLUMN IF NOT EXISTS appearance_probability INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS feed_interval INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS show_once_per_page BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN ads.appearance_probability IS 'Ad display probability (0-100)';
COMMENT ON COLUMN ads.feed_interval IS 'In-feed ad frequency (one ad every X items)';
COMMENT ON COLUMN ads.show_once_per_page IS 'Whether the ad should only show once per user page view';
