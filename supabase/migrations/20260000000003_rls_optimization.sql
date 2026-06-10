-- RLS 策略优化：简化策略逻辑，提升查询性能

-- 优化 media_items 的 SELECT 策略
DROP POLICY IF EXISTS "media_items_select_policy" ON media_items;
CREATE POLICY "media_items_select_optimized" ON media_items
  FOR SELECT
  USING (
    deleted_at IS NULL 
    AND (
      status::public.item_status = 'approved'::public.item_status
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- 优化 favorites 的 SELECT 策略
DROP POLICY IF EXISTS "favorites_select_policy" ON favorites;
CREATE POLICY "favorites_select_optimized" ON favorites
  FOR SELECT
  USING (user_id = auth.uid());

-- 优化 notifications 的 SELECT 策略
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
CREATE POLICY "notifications_select_optimized" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 为 profiles 表添加 role 索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_profiles_role_auth ON profiles(id, role) WHERE role = 'admin';

COMMENT ON POLICY "media_items_select_optimized" ON media_items IS '优化后的查询策略，减少子查询复杂度';
COMMENT ON POLICY "favorites_select_optimized" ON favorites IS '简化收藏查询策略';
COMMENT ON POLICY "notifications_select_optimized" ON notifications IS '简化通知查询策略';
