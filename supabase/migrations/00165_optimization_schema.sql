-- 增强标签系统：支持多级分类
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tags(id);
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 0;

-- 用户行为追踪表
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'click', 'share')),
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 增强推荐逻辑：根据用户偏好获取推荐内容的函数
CREATE OR REPLACE FUNCTION public.get_recommended_media_v2(p_user_id UUID, p_limit INTEGER, p_offset INTEGER)
RETURNS SETOF public.media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_interactions BOOLEAN;
BEGIN
    -- 检查用户是否有交互记录
    SELECT EXISTS (SELECT 1 FROM public.user_interactions WHERE user_id = p_user_id) INTO v_has_interactions;

    IF v_has_interactions THEN
        -- 如果有交互记录，基于标签权重推荐
        RETURN QUERY
        WITH user_tag_weights AS (
            SELECT 
                mt.tag_id,
                SUM(ui.weight) as total_weight
            FROM public.user_interactions ui
            JOIN public.media_tags mt ON ui.media_id = mt.media_id
            WHERE ui.user_id = p_user_id
            GROUP BY mt.tag_id
        ),
        media_scores AS (
            SELECT 
                m.id,
                SUM(COALESCE(utw.total_weight, 0)) as recommendation_score
            FROM public.media_items m
            LEFT JOIN public.media_tags mt ON m.id = mt.media_id
            LEFT JOIN user_tag_weights utw ON mt.tag_id = utw.tag_id
            WHERE m.status::public.item_status = 'approved'::public.item_status
            GROUP BY m.id
        )
        SELECT m.*
        FROM public.media_items m
        JOIN media_scores ms ON m.id = ms.id
        ORDER BY ms.recommendation_score DESC, m.created_at DESC
        LIMIT p_limit OFFSET p_offset;
    ELSE
        -- 如果没有交互记录，回退到最新内容
        RETURN QUERY
        SELECT *
        FROM public.media_items
        WHERE status::public.item_status = 'approved'::public.item_status
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$;
