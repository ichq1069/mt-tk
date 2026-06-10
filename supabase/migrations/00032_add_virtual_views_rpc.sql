-- 虚拟阅读量增加函数
create or replace function add_virtual_views(item_id uuid, amount int4)
returns void as $$
begin
  update media_items
  set view_count = view_count + amount
  where id = item_id;
end;
$$ language plpgsql security definer;
