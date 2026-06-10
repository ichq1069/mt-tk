-- Add openid to ad_events
ALTER TABLE ad_events ADD COLUMN IF NOT EXISTS openid text;

-- Add openid to mp_qr_generation_logs
ALTER TABLE mp_qr_generation_logs ADD COLUMN IF NOT EXISTS openid text;

-- Update mp_qr_generation_logs.ip_address length if needed, though text is usually fine.
-- Ensure we have a trigger or just update the logic in Edge Function for IP.
