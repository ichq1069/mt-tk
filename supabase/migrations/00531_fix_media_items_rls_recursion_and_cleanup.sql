-- 1. 清理 media_items 的冗余和递归策略
DROP POLICY IF EXISTS "Anyone can view approved media" ON public.media_items;
DROP POLICY IF EXISTS "Users can view their own media" ON public.media_items;
DROP POLICY IF EXISTS "Allow public select on media_items through join" ON public.media_items;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.media_items;
DROP POLICY IF EXISTS "Users can update their own media (except status)" ON public.media_items;
DROP POLICY IF EXISTS "Admins have full access to media" ON public.media_items;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_items;
DROP POLICY IF EXISTS "Users View Own" ON public.media_items;
DROP POLICY IF EXISTS "Public View Approved" ON public.media_items;
DROP POLICY IF EXISTS "media_items_select_optimized" ON public.media_items;
DROP POLICY IF EXISTS "media_items_update_own" ON public.media_items;
DROP POLICY IF EXISTS "media_items_admin_all" ON public.media_items;

-- 2. 重新创建清晰、无递归的策略

-- 查询策略：允许查看已批准的、自己的或管理员查看所有
CREATE POLICY "media_items_select_optimized" ON public.media_items
FOR SELECT TO public
USING (
  (deleted_at IS NULL) AND (
    (status = 'approved'::public.item_status) OR 
    (auth.uid() = user_id) OR 
    public.is_admin(auth.uid())
  )
);

-- 插入策略：仅限登录用户插入自己的媒体
CREATE POLICY "media_items_insert_own" ON public.media_items
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 更新策略：允许所有者更新自己的媒体（不涉及对同一表的递归子查询）
CREATE POLICY "media_items_update_own" ON public.media_items
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 删除策略：允许所有者或管理员删除
CREATE POLICY "media_items_delete_policy" ON public.media_items
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 管理员全权限策略（兜底）
CREATE POLICY "media_items_admin_all" ON public.media_items
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

COMMENT ON TABLE public.media_items IS '媒体库表，已修复 RLS 递归问题并清理冗余策略';