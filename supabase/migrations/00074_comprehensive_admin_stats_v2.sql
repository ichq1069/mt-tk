CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_users INT;
  v_pending INT;
  v_approved INT;
  v_archived INT;
  v_favorites INT;
  v_dislikes INT;
  v_views BIGINT;
  v_pending_reports INT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM public.profiles;
  SELECT COUNT(*) INTO v_pending FROM public.media_items WHERE status::public.item_status = 'pending'::public.item_status AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_approved FROM public.media_items WHERE status::public.item_status = 'approved'::public.item_status AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_archived FROM public.media_items WHERE status::public.item_status = 'archived'::public.item_status AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_pending_reports FROM public.reports WHERE status::public.item_status = 'pending'::public.item_status;
  
  -- Use coalesce for sums to avoid nulls
  SELECT COALESCE(SUM(favorite_count), 0) INTO v_favorites FROM public.media_items WHERE deleted_at IS NULL;
  SELECT COALESCE(SUM(dislike_count), 0) INTO v_dislikes FROM public.media_items WHERE deleted_at IS NULL;
  SELECT COALESCE(SUM(view_count), 0) INTO v_views FROM public.media_items WHERE deleted_at IS NULL;
  
  RETURN jsonb_build_object(
    'users', COALESCE(v_users, 0),
    'pending', COALESCE(v_pending, 0),
    'approved', COALESCE(v_approved, 0),
    'archived', COALESCE(v_archived, 0),
    'pending_reports', COALESCE(v_pending_reports, 0),
    'favorites', v_favorites,
    'dislikes', v_dislikes,
    'views', v_views
  );
END;
$function$;
