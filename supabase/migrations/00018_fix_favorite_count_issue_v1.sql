-- 添加 favorite_count 字段
alter table media_items add column if not exists favorite_count bigint default 0;

-- 预先填充数据
update media_items m
set favorite_count = (
  select count(*) from favorites f where f.media_id = m.id
);

-- 创建更新计数器的函数
create or replace function handle_favorite_count_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update media_items set favorite_count = favorite_count + 1 where id = new.media_id;
  elsif (tg_op = 'DELETE') then
    update media_items set favorite_count = favorite_count - 1 where id = old.media_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- 创建触发器
drop trigger if exists on_favorite_change on favorites;
create trigger on_favorite_change
after insert or delete on favorites
for each row execute function handle_favorite_count_change();

-- 修复推荐函数（确保使用最新的逻辑）
create or replace function get_recommended_media(
  page_offset int default 0,
  page_limit int default 10,
  current_user_id uuid default null
)
returns setof media_items as $$
begin
  return query
  select m.*
  from media_items m
  where m.status::public.item_status = 'approved'::public.item_status
  and (
    current_user_id is null 
    or not exists (
      select 1 from dislikes d 
      where d.media_id = m.id and d.user_id = current_user_id
    )
  )
  order by (coalesce(m.favorite_count, 0) * 5 + coalesce(m.views_count, 0)) desc, m.created_at desc
  limit page_limit
  offset page_offset;
end;
$$ language plpgsql security definer;
