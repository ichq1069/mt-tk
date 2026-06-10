ALTER TABLE ad_unlock_logs ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;
ALTER TABLE mp_login_logs ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;

-- Update RLS if needed (though usually it's fine for simple insertions)
-- For completeness, if there are existing policies, they should still work.
