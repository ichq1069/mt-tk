-- 1. 重新创建自动补充素材库函数，优化返回值和可见性
DROP FUNCTION IF EXISTS public.auto_refill_pending_daily_gallery_materials();

CREATE OR REPLACE FUNCTION public.auto_refill_pending_daily_gallery_materials()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  v_daily_count int;
  v_pending_count int;
  v_needed int;
  v_media_ids uuid[];
  v_result json;
begin
  -- 获取每日发布数量配置
  select (value->>'daily_count')::int into v_daily_count
  from public.system_configs
  where key = 'daily_gallery_config';
  
  -- 如果没配置，默认 5
  if v_daily_count is null then v_daily_count := 5; end if;
  
  -- 计算当前待发布素材数量 (pending 状态)
  select count(*) into v_pending_count
  from public.media_items
  where daily_gallery_status::public.item_status = 'pending'::public.item_status
    and status::public.item_status = 'approved'::public.item_status
    and is_hidden = false
    and type = 'image'
    and deleted_at is null;
    
  -- 严格补充：使得待发布库的总量等于每日发布量
  v_needed := v_daily_count - v_pending_count;
  
  if v_needed > 0 then
    -- 随机选取待使用素材 (unused 状态) 补充至待发布 (pending 状态)
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
      limit v_needed
    ) t;
    
    -- 更新状态为 pending
    if v_media_ids is not null then
      update public.media_items
      set daily_gallery_status::public.item_status = 'pending'::public.item_status
      where id = any(v_media_ids);
      
      v_result := json_build_object(
        'success', true,
        'message', '已成功补充 ' || array_length(v_media_ids, 1) || ' 张素材到待发布库',
        'added_count', array_length(v_media_ids, 1)
      );
    else
      v_result := json_build_object(
        'success', true,
        'message', '没有可用的未使用素材进行补充',
        'added_count', 0
      );
    end if;
  else
    v_result := json_build_object(
      'success', true,
      'message', '当前待发布素材库充足，无需补充',
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

-- 授权执行权限
GRANT EXECUTE ON FUNCTION public.auto_refill_pending_daily_gallery_materials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_refill_pending_daily_gallery_materials() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_refill_pending_daily_gallery_materials() TO anon;

-- 2. 确保每日图集配置中有 trigger_token
DO $$
DECLARE
  v_config json;
  v_token text;
BEGIN
  SELECT value INTO v_config FROM public.system_configs WHERE key = 'daily_gallery_config';
  
  IF v_config IS NOT NULL AND (v_config->>'trigger_token' IS NULL OR v_config->>'trigger_token' = '') THEN
    v_token := 'dg-' || encode(gen_random_bytes(8), 'hex');
    UPDATE public.system_configs 
    SET value = v_config || jsonb_build_object('trigger_token', v_token)::json 
    WHERE key = 'daily_gallery_config';
  END IF;
  
  IF v_config IS NULL THEN
    v_token := 'dg-' || encode(gen_random_bytes(8), 'hex');
    INSERT INTO public.system_configs (key, value, description)
    VALUES (
      'daily_gallery_config', 
      json_build_object(
        'daily_count', 5,
        'auto_publish', true,
        'publish_time', '00:00',
        'trigger_token', v_token,
        'password_duration', 1,
        'password_keyword', '今日图片',
        'enable_password', true
      ),
      '每日图集配置'
    );
  END IF;
END $$;

-- 刷新 schema 缓存
NOTIFY pgrst, 'reload schema';
