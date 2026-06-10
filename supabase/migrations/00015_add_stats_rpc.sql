CREATE OR REPLACE FUNCTION get_top_favorited_media(limit_count int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  title text,
  type text,
  url text,
  thumbnail_url text,
  favorite_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.title, 
    m.type, 
    m.url, 
    m.thumbnail_url, 
    COUNT(f.id) as favorite_count
  FROM 
    media_items m
  JOIN 
    favorites f ON m.id = f.media_id
  GROUP BY 
    m.id
  ORDER BY 
    favorite_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
