
-- Set search_path for functions reported by linter
ALTER FUNCTION public.handle_auth_user_update() SET search_path = public;
ALTER FUNCTION extensions.gen_salt(text) SET search_path = extensions;
ALTER FUNCTION extensions.gen_salt(text, integer) SET search_path = extensions;
ALTER FUNCTION extensions.crypt(text, text) SET search_path = extensions;
ALTER FUNCTION public.record_cache_hit(text, boolean) SET search_path = public;
ALTER FUNCTION public.get_media_library_v2(integer, integer, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_tag_management_stats() SET search_path = public;
ALTER FUNCTION public.update_media_status_rpc(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.batch_update_media_status_rpc(uuid[], text, text) SET search_path = public;
ALTER FUNCTION public.handle_profile_email_update() SET search_path = public;
ALTER FUNCTION public.batch_soft_delete_media(uuid[]) SET search_path = public;
ALTER FUNCTION public.batch_update_media_hashes(jsonb) SET search_path = public;
ALTER FUNCTION public.sync_media_items_tags() SET search_path = public;
ALTER FUNCTION public.transfer_zonerama_to_wallpaper(uuid[]) SET search_path = public;
ALTER FUNCTION public.transfer_zonerama_to_album(uuid[], uuid) SET search_path = public;
ALTER FUNCTION public.get_category_cloud() SET search_path = public;
ALTER FUNCTION public.get_terminal_analytics() SET search_path = public;
ALTER FUNCTION public.get_optimized_media_items_v3(uuid, text, text, uuid[], text, integer, integer) SET search_path = public;
