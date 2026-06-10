CREATE OR REPLACE FUNCTION reload_postgrest_schema()
RETURNS void AS $$
BEGIN
  -- Notify PostgREST to reload its schema cache
  -- This is a standard command for PostgREST
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
