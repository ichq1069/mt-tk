-- Correct the URL in the status change trigger function
CREATE OR REPLACE FUNCTION handle_album_access_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  album_title TEXT;
  msg_content TEXT;
BEGIN
  -- Get the album title
  SELECT title INTO album_title FROM photo_albums WHERE id = NEW.album_id;
  
  -- Create notification for status change (only if status actually changed to approved or rejected)
  IF (OLD.status IS NULL OR OLD.status <> NEW.status) AND (NEW.status::public.item_status = 'approved'::public.item_status OR NEW.status::public.item_status = 'rejected'::public.item_status) THEN
    IF NEW.status::public.item_status = 'approved'::public.item_status THEN
      msg_content := '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请已通过。授予级别：' || COALESCE(NEW.approved_level, 'PT');
    ELSE
      msg_content := '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请被拒绝。原因：' || COALESCE(NEW.rejected_reason, '无');
    END IF;

    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      channel,
      link,
      is_read,
      created_at
    ) VALUES (
      NEW.user_id,
      '图集申请审核结果',
      msg_content,
      'audit',
      'in_app',
      '/albums/' || NEW.album_id, -- Corrected from /album/ to /albums/
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger for request submission (initial insertion)
CREATE OR REPLACE FUNCTION handle_album_access_request_insertion()
RETURNS TRIGGER AS $$
DECLARE
  album_title TEXT;
BEGIN
  SELECT title INTO album_title FROM photo_albums WHERE id = NEW.album_id;

  -- Notify user that their request has been submitted
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    channel,
    link,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    '图集申请已提交',
    '您对图集《' || COALESCE(album_title, '未知图集') || '》的访问申请已提交，请等待管理员审核。',
    'system',
    'in_app',
    '/profile?tab=requests',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_album_access_request_insertion ON album_access_requests;
CREATE TRIGGER trg_album_access_request_insertion
AFTER INSERT ON album_access_requests
FOR EACH ROW
EXECUTE FUNCTION handle_album_access_request_insertion();
