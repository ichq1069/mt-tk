-- 为 user_visit_stats 表增加更详细的统计字段
alter table user_visit_stats 
add column if not exists device_type text,
add column if not exists country text,
add column if not exists region text,
add column if not exists city text,
add column if not exists referrer text,
add column if not exists resolution text,
add column if not exists language text,
add column if not exists page_title text;

-- 更新 upsert_user_visit_stats RPC 函数以支持新字段
create or replace function upsert_user_visit_stats(
  p_user_id uuid default null,
  p_ip_address text default 'unknown',
  p_browser text default 'unknown',
  p_os text default 'unknown',
  p_network_type text default 'unknown',
  p_path text default '/',
  p_duration integer default 0,
  p_adblock_enabled boolean default false,
  p_device_type text default 'PC',
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_referrer text default null,
  p_resolution text default null,
  p_language text default null,
  p_page_title text default null
)
returns void as $$
begin
  insert into user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title
  )
  values (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device_type, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title
  );
end;
$$ language plpgsql security definer;
