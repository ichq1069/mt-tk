CREATE OR REPLACE FUNCTION public.get_admin_distribution()
 RETURNS TABLE(name text, value bigint, type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  -- 内容类型分布
  select m.type::text as name, count(*) as value, 'media_type'::text as type 
  from media_items m group by m.type
  union all
  -- 内容状态分布
  select m.status::text as name, count(*) as value, 'media_status'::text as type 
  from media_items m group by m.status;
end;
$function$;