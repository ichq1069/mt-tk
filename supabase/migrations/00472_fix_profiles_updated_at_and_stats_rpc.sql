-- Fix 1: Add updated_at to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix 2: Fix get_admin_stats RPC to avoid ambiguous column references
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_count INT;
    v_pending_count INT;
    v_approved_count INT;
    v_archived_count INT;
    v_favorite_count INT;
    v_dislike_count INT;
    v_view_count INT;
    v_pending_reports_count INT;
    v_pending_album_requests_count INT;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM public.profiles;
    SELECT COUNT(*) INTO v_pending_count FROM public.media_items WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO v_approved_count FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status;
    SELECT COUNT(*) INTO v_archived_count FROM public.media_items WHERE status::public.item_status = 'archived'::public.item_status;
    SELECT COALESCE(SUM(favorite_count), 0) INTO v_favorite_count FROM public.media_items;
    SELECT COALESCE(SUM(dislike_count), 0) INTO v_dislike_count FROM public.media_items;
    SELECT COALESCE(SUM(view_count), 0) INTO v_view_count FROM public.media_items;
    SELECT COUNT(*) INTO v_pending_reports_count FROM public.reports WHERE status::public.item_status = 'pending'::public.item_status;
    SELECT COUNT(*) INTO v_pending_album_requests_count FROM public.album_access_requests WHERE status::public.item_status = 'pending'::public.item_status;

    RETURN jsonb_build_object(
        'users', v_user_count,
        'pending', v_pending_count,
        'approved', v_approved_count,
        'archived', v_archived_count,
        'favorites', v_favorite_count,
        'dislikes', v_dislike_count,
        'views', v_view_count,
        'pending_reports', v_pending_reports_count,
        'pending_album_requests', v_pending_album_requests_count
    );
END;
$$;
