create or replace function increment_view_count(item_id uuid)
returns void as $$
begin
  update media_items
  set view_count = coalesce(view_count, 0) + 1
  where id = item_id;
end;
$$ language plpgsql security definer;
