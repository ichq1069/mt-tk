-- 1. Create domain_configs table if not exists (to satisfy migration expectations)
CREATE TABLE IF NOT EXISTS domain_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_url text NOT NULL UNIQUE,
  identifier text NOT NULL DEFAULT 'default',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add domain_identifier to wechat_users if not exists
ALTER TABLE wechat_users ADD COLUMN IF NOT EXISTS domain_identifier text DEFAULT 'default';

-- 3. Add domain_identifier and site_url to wechat_binding_requests if not exists
ALTER TABLE wechat_binding_requests ADD COLUMN IF NOT EXISTS domain_identifier text DEFAULT 'default';
ALTER TABLE wechat_binding_requests ADD COLUMN IF NOT EXISTS site_url text;

-- 4. Re-ensure dedupe tables and columns exist (from previous turn)
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS dedupe_error text;
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS dedupe_ignored boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS dedupe_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_type text NOT NULL, -- 'md5', 'visual'
    processed_count int DEFAULT 0,
    duplicate_count int DEFAULT 0,
    scan_config jsonb,
    created_at timestamptz DEFAULT now(),
    duration_ms int,
    status text DEFAULT 'completed' -- 'completed', 'failed'
);
