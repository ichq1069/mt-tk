-- 增加浏览量字段
alter table media_items add column if not exists views_count bigint default 0;

-- 增加浏览量的函数
create or replace function increment_media_view(item_id uuid)
returns void as $$
begin
  update media_items
  set views_count = views_count + 1
  where id = item_id;
end;
$$ language plpgsql security definer;

-- 推荐算法函数 (基于收藏和浏览量)
-- 权重：收藏 * 5 + 浏览量
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
  -- 过滤掉用户不喜欢的 (如果有 dislikes 表)
  and (
    current_user_id is null 
    or not exists (
      select 1 from dislikes d 
      where d.media_id = m.id and d.user_id = current_user_id
    )
  )
  order by (m.favorite_count * 5 + m.views_count) desc, m.created_at desc
  limit page_limit
  offset page_offset;
end;
$$ language plpgsql security definer;
