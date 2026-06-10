-- 创建通知函数
CREATE OR REPLACE FUNCTION handle_album_access_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_album_title TEXT;
BEGIN
  -- 获取图集标题
  SELECT title INTO v_album_title FROM photo_albums WHERE id = NEW.album_id;

  -- 审核通过
  IF NEW.status::public.item_status = 'approved'::public.item_status AND (OLD.status IS NULL OR OLD.status::public.item_status != 'approved'::public.item_status) THEN
    INSERT INTO notifications (user_id, title, content, type, link, link_type)
    VALUES (
      NEW.user_id, 
      '图集申请已通过', 
      '您申请的图集《' || COALESCE(v_album_title, '未知图集') || '》已审核通过，现在可以前往查看了。', 
      'audit', 
      '/album/' || NEW.album_id::text, 
      'internal'
    );
  -- 审核拒绝
  ELSIF NEW.status::public.item_status = 'rejected'::public.item_status AND (OLD.status IS NULL OR OLD.status::public.item_status != 'rejected'::public.item_status) THEN
    INSERT INTO notifications (user_id, title, content, type, link, link_type)
    VALUES (
      NEW.user_id, 
      '图集申请已拒绝', 
      '很抱歉，您申请的图集《' || COALESCE(v_album_title, '未知图集') || '》已被管理员拒绝。拒绝原因：' || COALESCE(NEW.rejected_reason, '无具体原因'), 
      'audit', 
      '/album/' || NEW.album_id::text, 
      'internal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_album_access_request_status_change ON album_access_requests;
CREATE TRIGGER on_album_access_request_status_change
  AFTER UPDATE OF status ON album_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_album_access_request_status_change();
