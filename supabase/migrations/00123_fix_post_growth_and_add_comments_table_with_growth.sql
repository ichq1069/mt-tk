-- 修改内容发布奖励逻辑：仅在审核通过时奖励
CREATE OR REPLACE FUNCTION public.handle_post_growth()
RETURNS trigger AS $$
BEGIN
    -- INSERT 且状态为 approved (管理员直发) 或 UPDATE 状态变为 approved (审核通过)
    IF (TG_OP = 'INSERT' AND NEW.status::public.item_status = 'approved'::public.item_status) OR 
       (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status::public.item_status != 'approved'::public.item_status) AND NEW.status::public.item_status = 'approved'::public.item_status) THEN
        
        -- 避免重复奖励：检查是否有相同 user_id 和 media_id 的发布奖励
        IF NOT EXISTS (
            SELECT 1 FROM public.growth_logs 
            WHERE user_id = NEW.user_id 
            AND type = 'post' 
            AND reason LIKE '%' || NEW.id || '%'
        ) THEN
            PERFORM public.add_user_exp(NEW.user_id, 20, '发布内容奖励 (ID: ' || NEW.id || ')', 'post');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新媒体项触发器
DROP TRIGGER IF EXISTS tr_post_growth ON public.media_items;
CREATE TRIGGER tr_post_growth
AFTER INSERT OR UPDATE ON public.media_items
FOR EACH ROW EXECUTE FUNCTION public.handle_post_growth();

-- 创建评论表及其成长逻辑
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 开启评论表权限
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow owners to delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 评论成长奖励函数
CREATE OR REPLACE FUNCTION public.handle_comment_growth()
RETURNS trigger AS $$
BEGIN
    -- 每天前三次评论奖励 5 EXP
    IF (
        SELECT COUNT(*) FROM public.growth_logs 
        WHERE user_id = NEW.user_id 
        AND type = 'comment' 
        AND created_at::date = CURRENT_DATE
    ) < 3 THEN
        PERFORM public.add_user_exp(NEW.user_id, 5, '发表评论奖励', 'comment');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 评论触发器
DROP TRIGGER IF EXISTS tr_comment_growth ON public.comments;
CREATE TRIGGER tr_comment_growth
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_comment_growth();
