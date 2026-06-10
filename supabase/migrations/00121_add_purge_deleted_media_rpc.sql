-- 清空回收站
create or replace function purge_all_deleted_media()
returns void as $$
begin
  delete from media_items
  where deleted_at is not null;
end;
$$ language plpgsql security definer;
