CREATE OR REPLACE FUNCTION bulk_update_media_dedupe(p_updates jsonb)
RETURNS void AS $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(id uuid, content_hash text, dedupe_error text, updated_at timestamptz)
  LOOP
    UPDATE media_items
    SET 
      content_hash = u.content_hash,
      dedupe_error = u.dedupe_error,
      updated_at = u.updated_at
    WHERE id = u.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
