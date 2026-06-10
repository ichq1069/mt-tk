-- 1. 创建或更新标记图片为已使用的函数
CREATE OR REPLACE FUNCTION public.mark_images_as_used(image_ids uuid[], post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.media_items
  SET daily_gallery_status = 'used'
  WHERE id = ANY(image_ids);
END;
$function$;

-- 2. 改进自动补充函数，确保待发布总数不超过 daily_count
CREATE OR REPLACE FUNCTION public.auto_refill_pending_daily_gallery_materials()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_daily_count int;
  v_current_pending_count int;
  v_needed_count int;
  v_media_ids uuid[];
  v_result json;
begin
  -- 获取每日发布数量配置
  select (value->>'daily_count')::int into v_daily_count
  from public.system_configs
  where key = 'daily_gallery_config';
  
  -- 如果没配置，默认 5
  if v_daily_count is null then v_daily_count := 5; end if;
  
  -- 获取当前待发布素材的数量
  select count(*) into v_current_pending_count
  from public.media_items
  where daily_gallery_status::public.item_status = 'pending'::public.item_status
    and status::public.item_status = 'approved'::public.item_status
    and is_hidden = false
    and type = 'image'
    and deleted_at is null;
    
  v_needed_count := v_daily_count - v_current_pending_count;
  
  if v_needed_count <= 0 then
    return json_build_object(
      'success', true,
      'message', '当前待发布素材已充足，无需补充 (当前: ' || v_current_pending_count || ', 目标: ' || v_daily_count || ')',
      'added_count', 0
    );
  end if;

  -- 随机选取从未使用的素材补充至待发布 (未使用定义：从未出现在任何发布记录中，且状态为 unused)
  select array_agg(id) into v_media_ids
  from (
    select m.id
    from public.media_items m
    where m.daily_gallery_status = 'unused'
      and m.status::public.item_status = 'approved'::public.item_status
      and m.is_hidden = false
      and m.type = 'image'
      and m.deleted_at is null
      and (m.exclude_from_daily_gallery = false or m.exclude_from_daily_gallery is null)
      -- 核心逻辑：从未出现在发布记录中
      and not exists (
        select 1 from public.daily_gallery_posts p 
        where m.id = any(p.image_ids)
      )
    order by random()
    limit v_needed_count
  ) t;
  
  -- 更新状态为 pending
  if v_media_ids is not null then
    update public.media_items
    set daily_gallery_status::public.item_status = 'pending'::public.item_status
    where id = any(v_media_ids);
    
    v_result := json_build_object(
      'success', true,
      'message', '已成功补充 ' || array_length(v_media_ids, 1) || ' 张素材到待发布库 (当前: ' || (v_current_pending_count + array_length(v_media_ids, 1)) || ')',
      'added_count', array_length(v_media_ids, 1)
    );
  else
    v_result := json_build_object(
      'success', false,
      'message', '没有足够的从未使用的素材可供补充',
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

-- 3. 改进获取已使用素材的函数
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer, p_offset integer, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date, has_record boolean, daily_gallery_status text)
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
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text
  FROM public.media_items m
  -- 只要在发布记录中的，都算已使用
  JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  ORDER BY p.post_date DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- 4. 创建获取可用素材的 RPC，增加从未使用的过滤
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(p_limit integer, p_offset integer, p_search text, p_status text)
 RETURNS TABLE(id uuid, url text, title text, description text, status text, daily_gallery_status text, created_at timestamp with time zone)
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
    m.status::text, 
    m.daily_gallery_status::text,
    m.created_at
  FROM public.media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status
    AND m.is_hidden = false
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
    AND m.daily_gallery_status = p_status
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
    -- 如果是 unused 状态，增加从未使用的核心过滤
    AND (
      p_status != 'unused' OR NOT EXISTS (
        SELECT 1 FROM public.daily_gallery_posts p 
        WHERE m.id = ANY(p.image_ids)
      )
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
