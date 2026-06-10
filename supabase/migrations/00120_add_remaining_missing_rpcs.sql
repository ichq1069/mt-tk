-- 归档所有审核通过的内容
create or replace function archive_all_approved_media()
returns void as $$
begin
  update media_items
  set status::public.item_status = 'archived'::public.item_status
  where status::public.item_status = 'approved'::public.item_status
  and deleted_at is null;
end;
$$ language plpgsql security definer;

-- 优化数据库
create or replace function optimize_database()
returns void as $$
begin
  analyze;
end;
$$ language plpgsql security definer;

-- 审核通知合并逻辑
create or replace function create_or_merge_audit_notification(
  user_id uuid,
  media_id uuid,
  media_title text,
  status text,
  reason text default null
)
returns void as $$
declare
  v_merge_key text;
  v_title text;
  v_content text;
  v_existing_id uuid;
  v_existing_count integer;
  v_existing_media_ids jsonb;
begin
  -- 创建合并 key：用户 + 状态 + 今天日期
  v_merge_key := 'audit_' || status || '_' || user_id || '_' || current_date::text;
  
  -- 查找是否已经存在该合并通知
  select id, count, media_ids into v_existing_id, v_existing_count, v_existing_media_ids
  from notifications
  where user_id = create_or_merge_audit_notification.user_id
  and merge_key = v_merge_key
  and is_read = false
  limit 1;

  if v_existing_id is not null then
    -- 如果已存在，则更新
    v_existing_count := v_existing_count + 1;
    v_existing_media_ids := v_existing_media_ids || jsonb_build_array(media_id);
    
    if status::public.item_status = 'approved'::public.item_status then
      v_title := '审核通过通知';
      v_content := '您有 ' || v_existing_count || ' 个作品已通过审核并发布。';
    else
      v_title := '审核未通过通知';
      v_content := '您有 ' || v_existing_count || ' 个作品审核未通过。理由：' || coalesce(reason, '未提供理由');
    end if;

    update notifications
    set 
      count = v_existing_count,
      media_ids = v_existing_media_ids,
      title = v_title,
      content = v_content,
      created_at = now()
    where id = v_existing_id;
  else
    -- 如果不存在，则插入新记录
    if status::public.item_status = 'approved'::public.item_status then
      v_title := '审核通过通知';
      v_content := '您的作品《' || media_title || '》已通过审核并发布。';
    else
      v_title := '审核未通过通知';
      v_content := '您的作品《' || media_title || '》未通过审核。理由：' || coalesce(reason, '未提供理由');
    end if;

    insert into notifications (
      user_id,
      title,
      content,
      type,
      channel,
      count,
      media_ids,
      merge_key,
      link,
      link_type
    ) values (
      user_id,
      v_title,
      v_content,
      'audit',
      'in_app',
      1,
      jsonb_build_array(media_id),
      v_merge_key,
      '/profile',
      'internal'
    );
  end if;
end;
$$ language plpgsql security definer;
