-- 更新终端统计聚合函数，直接使用新增的 device_type 列
create or replace function get_terminal_analytics()
returns json as $$
declare
    browser_dist json;
    os_dist json;
    daily_visits json;
    path_dist json;
    device_dist json;
begin
    -- 浏览器分布
    select json_agg(t) into browser_dist from (
        select browser as name, count(*) as value
        from user_visit_stats
        where browser is not null
        group by browser
        order by value desc
    ) t;

    -- 操作系统分布
    select json_agg(t) into os_dist from (
        select os as name, count(*) as value
        from user_visit_stats
        where os is not null
        group by os
        order by value desc
    ) t;

    -- 每日访问量 (最近 15 天)
    select json_agg(t) into daily_visits from (
        select 
            to_char(created_at, 'YYYY-MM-DD') as day,
            count(*) as count,
            count(distinct coalesce(user_id::text, ip_address)) as unique_visitors
        from user_visit_stats
        where created_at > now() - interval '15 days'
        group by day
        order by day asc
    ) t;

    -- 热门路径
    select json_agg(t) into path_dist from (
        select path as name, count(*) as value
        from user_visit_stats
        where path is not null
        group by path
        order by value desc
        limit 10
    ) t;

    -- 设备终端分布 (直接使用 device_type 列，更准确)
    select json_agg(t) into device_dist from (
        select 
            coalesce(device_type, 'PC') as name,
            count(*) as value
        from user_visit_stats
        group by name
        order by value desc
    ) t;

    return json_build_object(
        'browser_distribution', coalesce(browser_dist, '[]'::json),
        'os_distribution', coalesce(os_dist, '[]'::json),
        'daily_visits', coalesce(daily_visits, '[]'::json),
        'path_distribution', coalesce(path_dist, '[]'::json),
        'device_distribution', coalesce(device_dist, '[]'::json)
    );
end;
$$ language plpgsql security definer;
