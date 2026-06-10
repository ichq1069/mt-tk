ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS enable_video_proxy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_proxy_url TEXT,
ADD COLUMN IF NOT EXISTS video_proxy_secret TEXT,
ADD COLUMN IF NOT EXISTS video_proxy_rules JSONB DEFAULT '[]'::jsonb;

-- Create a table for video proxy logs as mentioned in PRD
CREATE TABLE IF NOT EXISTS video_proxy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_url TEXT NOT NULL,
  proxy_url TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  response_time INTEGER, -- in ms
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for the logs table
ALTER TABLE video_proxy_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see logs
CREATE POLICY "Admins can see video proxy logs" ON video_proxy_logs
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM profiles WHERE role = 'admin'));
