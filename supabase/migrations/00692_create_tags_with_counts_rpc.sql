CREATE OR REPLACE FUNCTION get_tags_with_counts()
RETURNS TABLE (
    id uuid,
    name text,
    use_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, 
        t.name, 
        COUNT(mt.tag_id)::bigint as use_count
    FROM tags t
    LEFT JOIN media_tags mt ON t.id = mt.tag_id
    GROUP BY t.id, t.name
    ORDER BY use_count DESC;
END;
$$;