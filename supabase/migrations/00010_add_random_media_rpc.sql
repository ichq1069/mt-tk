CREATE OR REPLACE FUNCTION get_random_media(limit_count int)
RETURNS SETOF media_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM media_items
  WHERE status::public.item_status = 'approved'::public.item_status
  ORDER BY random()
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
