create or replace function handle_media_download(
  p_user_id uuid,
  p_media_id uuid,
  p_album_id uuid,
  p_type text,
  p_points integer
) returns json as $$
declare
  v_points integer;
  v_success boolean;
  v_message text;
  v_recharged boolean := false;
  v_reason text;
begin
  -- 获取当前用户积分
  select points into v_points from profiles where id = p_user_id;
  
  -- 如果已经下载过，不扣分
  if exists (
    select 1 from media_downloads 
    where user_id = p_user_id 
    and (
      (p_type = 'wallpaper' and media_id = p_media_id) or 
      (p_type = 'album' and album_id = p_album_id)
    )
  ) then
    return json_build_object('success', true, 'recharged', false, 'message', '已下载过，无需再次扣分');
  end if;

  -- 检查积分是否足够
  if v_points < p_points then
    return json_build_object('success', false, 'recharged', false, 'message', '积分不足');
  end if;

  -- 扣除积分
  update profiles set points = points - p_points where id = p_user_id;
  
  -- 记录下载行为
  insert into media_downloads (user_id, media_id, album_id, type, points_spent)
  values (p_user_id, p_media_id, p_album_id, p_type, p_points);

  -- 记录积分流水 (使用 reason 而不是 remark)
  v_reason := case 
    when p_type = 'wallpaper' then '下载壁纸' 
    else '下载写真图集' 
  end;
  
  insert into points_logs (user_id, amount, reason, type, target_id)
  values (p_user_id, -p_points, v_reason, 'media_download', coalesce(p_media_id::text, p_album_id::text));

  return json_build_object('success', true, 'recharged', true, 'message', '下载成功');
end;
$$ language plpgsql security definer;
