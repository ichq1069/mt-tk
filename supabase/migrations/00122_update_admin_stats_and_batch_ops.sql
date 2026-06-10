create or replace function get_admin_stats()
returns jsonb as $$
declare
  v_users int;
  v_pending int;
  v_approved int;
  v_archived int;
  v_deleted int;
  v_favorites int;
  v_dislikes int;
  v_views bigint;
  v_pending_reports int;
begin
  select count(*) into v_users from public.profiles;
  select count(*) into v_pending from public.media_items where status::public.item_status = 'pending'::public.item_status and deleted_at is null;
  select count(*) into v_approved from public.media_items where status::public.item_status = 'approved'::public.item_status and deleted_at is null;
  select count(*) into v_archived from public.media_items where status::public.item_status = 'archived'::public.item_status and deleted_at is null;
  select count(*) into v_deleted from public.media_items where deleted_at is not null;
  select count(*) into v_pending_reports from public.reports where status::public.item_status = 'pending'::public.item_status;
  
  select coalesce(sum(favorite_count), 0) into v_favorites from public.media_items where deleted_at is null;
  select coalesce(sum(dislike_count), 0) into v_dislikes from public.media_items where deleted_at is null;
  select coalesce(sum(view_count), 0) into v_views from public.media_items where deleted_at is null;
  
  return jsonb_build_object(
    'users', coalesce(v_users, 0),
    'pending', coalesce(v_pending, 0),
    'approved', coalesce(v_approved, 0),
    'archived', coalesce(v_archived, 0),
    'deleted', coalesce(v_deleted, 0),
    'pending_reports', coalesce(v_pending_reports, 0),
    'favorites', v_favorites,
    'dislikes', v_dislikes,
    'views', v_views
  );
end;
$$ language plpgsql security definer;

create or replace function batch_hard_delete_media(p_ids uuid[])
returns void as $$
begin
  delete from public.media_items where id = any(p_ids);
end;
$$ language plpgsql security definer;

create or replace function batch_restore_media(p_ids uuid[])
returns void as $$
begin
  update public.media_items set deleted_at = null where id = any(p_ids);
end;
$$ language plpgsql security definer;

create or replace function batch_soft_delete_media(p_ids uuid[])
returns void as $$
begin
  update public.media_items set deleted_at = now() where id = any(p_ids);
end;
$$ language plpgsql security definer;
