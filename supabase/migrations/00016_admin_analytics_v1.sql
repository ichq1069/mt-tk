
create or replace function get_admin_analytics()
returns table(
  day date,
  upload_count bigint,
  user_count bigint
) language plpgsql security definer as $$
begin
  return query
  select 
    d::date as day,
    (select count(*) from media_items where created_at::date = d::date) as upload_count,
    (select count(*) from profiles where created_at::date = d::date) as user_count
  from generate_series(
    current_date - interval '29 days',
    current_date,
    interval '1 day'
  ) d
  order by day asc;
end;
$$;

create or replace function get_admin_distribution()
returns table(
  name text,
  value bigint,
  type text
) language plpgsql security definer as $$
begin
  return query
  -- 内容类型分布
  select type::text as name, count(*) as value, 'media_type'::text as type 
  from media_items group by type
  union all
  -- 内容状态分布
  select status::text as name, count(*) as value, 'media_status'::text as type 
  from media_items group by status;
end;
$$;
