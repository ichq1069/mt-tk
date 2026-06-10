CREATE OR REPLACE FUNCTION get_album_photo_level_counts(p_album_id UUID)
RETURNS JSONB AS $$
DECLARE
    counts JSONB;
BEGIN
    SELECT jsonb_build_object(
        'normal', COUNT(*) FILTER (WHERE level = 'normal'),
        'vip', COUNT(*) FILTER (WHERE level = 'vip'),
        'svip', COUNT(*) FILTER (WHERE level = 'svip'),
        'restricted', COUNT(*) FILTER (WHERE level = 'restricted'),
        'total', COUNT(*)
    ) INTO counts
    FROM album_photos
    WHERE album_id = p_album_id;
    
    RETURN counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;