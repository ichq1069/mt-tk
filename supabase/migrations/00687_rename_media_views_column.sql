-- Rename column to bypass potential stale PostgREST cache
ALTER TABLE media_views RENAME COLUMN browser_fingerprint TO visitor_fingerprint;
