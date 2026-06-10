-- 修复 item_status 操作符冲突问题

-- 1. 删除所有依赖于 status 列的策略
DROP POLICY IF EXISTS "Admins have full access to media" ON public.media_items;
DROP POLICY IF EXISTS "Allow public select on media_items through join" ON public.media_items;
DROP POLICY IF EXISTS "Anyone can view approved media" ON public.media_items;
DROP POLICY IF EXISTS "Public View Approved" ON public.media_items;
DROP POLICY IF EXISTS "Users View Own" ON public.media_items;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_items;
DROP POLICY IF EXISTS "Users can insert their own media" ON public.media_items;
DROP POLICY IF EXISTS "Users can update their own media (except status)" ON public.media_items;
DROP POLICY IF EXISTS "Users can view their own media" ON public.media_items;
DROP POLICY IF EXISTS "media_items_select_optimized" ON public.media_items;

-- 2. 检查并修复 item_status 类型定义
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
        CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'rejected', 'archived');
    END IF;
END $$;

-- 3. 确保 media_items 表的 status 列类型正确
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'media_items' 
               AND column_name = 'status') THEN
        ALTER TABLE public.media_items 
        ALTER COLUMN status TYPE public.item_status 
        USING status::public.item_status;
    END IF;
END $$;

-- 4. 重新创建核心策略
CREATE POLICY "Public View Approved" ON public.media_items 
    FOR SELECT USING (status = 'approved'::public.item_status);

CREATE POLICY "Users can view their own media" ON public.media_items 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON public.media_items 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media (except status)" ON public.media_items 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (status IS NOT DISTINCT FROM (SELECT status FROM public.media_items WHERE id = id));

CREATE POLICY "Admins have full access to media" ON public.media_items 
    FOR ALL TO authenticated 
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can delete their own media" ON public.media_items
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 5. 重新创建关键函数
CREATE OR REPLACE FUNCTION public.get_random_media_items(
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS SETOF public.media_items AS 3061
BEGIN
    RETURN QUERY
    SELECT * FROM public.media_items 
    WHERE status = 'approved'::public.item_status 
    AND deleted_at IS NULL 
    AND is_hidden = false
    ORDER BY RANDOM()
    LIMIT p_limit OFFSET p_offset;
END;
3061 LANGUAGE plpgsql SECURITY DEFINER;
