drop function if exists handle_media_download(uuid,uuid,uuid,text,integer);

create or replace function handle_media_download(
  p_user_id uuid,
  p_media_id uuid,
  p_album_id uuid,
  p_type text,
  p_points int
) returns json as $$
declare
  v_points_balance int;
  v_has_downloaded boolean;
begin
  -- 1. 检查是否已经下载过
  if p_type = 'wallpaper' then
    select exists(select 1 from media_downloads where user_id = p_user_id and media_id = p_media_id and type = 'wallpaper') into v_has_downloaded;
  else
    select exists(select 1 from media_downloads where user_id = p_user_id and album_id = p_album_id and type = 'album') into v_has_downloaded;
  end if;

  if v_has_downloaded then
    return json_build_object('success', true, 'recharged', false, 'message', 'Already downloaded');
  end if;

  -- 2. 检查余额
  select points into v_points_balance from profiles where id = p_user_id;
  if v_points_balance < p_points then
    return json_build_object('success', false, 'message', '余额不足');
  end if;

  -- 3. 扣除积分
  if p_points > 0 then
    update profiles set points = points - p_points where id = p_user_id;

    -- 4. 记录日志
    insert into points_logs (user_id, amount, type, remark)
    values (p_user_id, -p_points, 'media_download', 
      case when p_type = 'wallpaper' then '壁纸下载扣除' else '写真单张下载扣除' end);
  end if;

  -- 5. 记录下载
  insert into media_downloads (user_id, media_id, album_id, type, points_spent)
  values (p_user_id, p_media_id, p_album_id, p_type, p_points);

  return json_build_object('success', true, 'recharged', p_points > 0);
end;
$$ language plpgsql security definer;
