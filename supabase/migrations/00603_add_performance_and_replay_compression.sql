CREATE TABLE IF NOT EXISTS analytics_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id uuid REFERENCES analytics_websites(id) ON DELETE CASCADE,
  session_id uuid REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  visitor_id uuid REFERENCES analytics_visitors(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value float NOT NULL,
  metric_id text,
  page_path text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_website ON analytics_performance(website_id);
CREATE INDEX IF NOT EXISTS idx_performance_session ON analytics_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metric ON analytics_performance(metric_name);

ALTER TABLE analytics_replays ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE;
ALTER TABLE analytics_replays ADD COLUMN IF NOT EXISTS compressed_events TEXT;
