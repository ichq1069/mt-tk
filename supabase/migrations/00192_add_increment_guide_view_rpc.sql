CREATE OR REPLACE FUNCTION increment_guide_view(guide_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE system_guides
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = guide_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;