drop function if exists get_top_favorited_media(int);

create or replace function get_top_favorited_media(limit_count int)
returns table (
  id uuid,
  title text,
  type text,
  url text,
  thumbnail_url text,
  favorite_count bigint
) language plpgsql security definer as $$
begin
  return query
  select 
    m.id, 
    m.title, 
    m.type, 
    m.url, 
    m.thumbnail_url, 
    m.favorite_count
  from 
    media_items m
  where 
    m.status::public.item_status = 'approved'::public.item_status
  order by 
    m.favorite_count desc, m.views_count desc
  limit limit_count;
end;
$$;
