-- 1. 修正自动补充函数：始终抽取系统配置的张数，而不是补足到该张数
DROP FUNCTION IF EXISTS public.auto_refill_pending_daily_gallery_materials();
CREATE OR REPLACE FUNCTION public.auto_refill_pending_daily_gallery_materials()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  v_daily_count int;
  v_media_ids uuid[];
  v_result json;
begin
  -- 获取每日发布数量配置
  select (value->>'daily_count')::int into v_daily_count
  from public.system_configs
  where key = 'daily_gallery_config';
  
  -- 如果没配置，默认 5
  if v_daily_count is null then v_daily_count := 5; end if;
  
  -- 随机选取待使用素材 (unused 状态) 补充至待发布 (pending 状态)
  -- 按照用户最新要求：直接随机抽取系统配置的数量张数
  select array_agg(id) into v_media_ids
  from (
    select id
    from public.media_items
    where daily_gallery_status = 'unused'
      and status::public.item_status = 'approved'::public.item_status
      and is_hidden = false
      and type = 'image'
      and deleted_at is null
      and (exclude_from_daily_gallery = false or exclude_from_daily_gallery is null)
    order by random()
    limit v_daily_count
  ) t;
  
  -- 更新状态为 pending
  if v_media_ids is not null then
    update public.media_items
    set daily_gallery_status::public.item_status = 'pending'::public.item_status
    where id = any(v_media_ids);
    
    v_result := json_build_object(
      'success', true,
      'message', '已成功从素材库中随机补充 ' || array_length(v_media_ids, 1) || ' 张素材到待发布库',
      'added_count', array_length(v_media_ids, 1)
    );
  else
    v_result := json_build_object(
      'success', false,
      'message', '没有足够的未使用素材可供补充',
      'added_count', 0
    );
  end if;
  
  return v_result;
exception when others then
  return json_build_object(
    'success', false,
    'message', '补充素材过程中出错: ' || SQLERRM
  );
end;
$function$;

-- 2. 修正已使用素材库查询：使用 LEFT JOIN 以便能展示“无发布记录”的素材
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer, text);
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer, p_offset integer, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date, has_record boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    p.created_at as used_at, 
    p.post_date,
    (p.id IS NOT NULL) as has_record
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  ORDER BY p.post_date DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- 3. 添加释放“无发布记录”图片的函数
DROP FUNCTION IF EXISTS public.release_orphaned_daily_gallery_images();
CREATE OR REPLACE FUNCTION public.release_orphaned_daily_gallery_images()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_count int;
begin
  -- 将所有状态为 used 但在任何发布记录中都找不到的图片，设回 unused
  update public.media_items m
  set daily_gallery_status = 'unused'
  where m.daily_gallery_status = 'used'
    and m.type = 'image'
    and m.deleted_at is null
    and not exists (
      select 1 from public.daily_gallery_posts p 
      where m.id = any(p.image_ids)
    );
    
  get diagnostics v_count = row_count;
  
  return json_build_object(
    'success', true,
    'message', '已成功释放 ' || v_count || ' 张无发布记录的图片回到待使用库',
    'count', v_count
  );
end;
$function$;

-- 授权执行权限
GRANT EXECUTE ON FUNCTION public.release_orphaned_daily_gallery_images() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_orphaned_daily_gallery_images() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_refill_pending_daily_gallery_materials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_refill_pending_daily_gallery_materials() TO service_role;

-- 刷新 schema 缓存
NOTIFY pgrst, 'reload schema';
