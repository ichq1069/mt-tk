-- 创建或更新获取管理后台统计数据的函数
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count INT;
  pending_reports_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count FROM media_items WHERE status::public.item_status = 'pending'::public.item_status;
  SELECT COUNT(*) INTO pending_reports_count FROM reports WHERE status::public.item_status = 'pending'::public.item_status;
  
  RETURN jsonb_build_object(
    'pending', pending_count,
    'pending_reports', pending_reports_count
  );
END;
$$;

-- 确保 profiles 和 permission_groups 的关联正确
-- 如果 profiles 表没有 group_id，添加它
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'group_id') THEN
    ALTER TABLE profiles ADD COLUMN group_id UUID REFERENCES permission_groups(id);
  END IF;
END $$;
