-- Dummy migration to force PostgREST schema cache reload
COMMENT ON COLUMN media_views.browser_fingerprint IS 'Browser fingerprint for guest tracking';
