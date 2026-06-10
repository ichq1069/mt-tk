-- Add last_mode to album_viewing_history if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'album_viewing_history' AND column_name = 'last_mode') THEN
        ALTER TABLE album_viewing_history ADD COLUMN last_mode TEXT;
    END IF;
END $$;

-- Update admin stats to include pending album requests
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_count INT;
    pending_count INT;
    approved_count INT;
    archived_count INT;
    favorite_count INT;
    dislike_count INT;
    view_count INT;
    pending_reports_count INT;
    pending_album_requests_count INT;
BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
    SELECT COUNT(*) INTO pending_count FROM media_items WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO approved_count FROM media_items WHERE status::public.item_status = 'approved'::public.item_status;
    SELECT COUNT(*) INTO archived_count FROM media_items WHERE status::public.item_status = 'archived'::public.item_status;
    SELECT COALESCE(SUM(favorite_count), 0) INTO favorite_count FROM media_items;
    SELECT COALESCE(SUM(dislike_count), 0) INTO dislike_count FROM media_items;
    SELECT COALESCE(SUM(view_count), 0) INTO view_count FROM media_items;
    SELECT COUNT(*) INTO pending_reports_count FROM reports WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO pending_album_requests_count FROM album_access_requests WHERE status::public.item_status = 'pending'::public.item_status;

    RETURN jsonb_build_object(
        'users', user_count,
        'pending', pending_count,
        'approved', approved_count,
        'archived', archived_count,
        'favorites', favorite_count,
        'dislikes', dislike_count,
        'views', view_count,
        'pending_reports', pending_reports_count,
        'pending_album_requests', pending_album_requests_count
    );
END;
$$;
