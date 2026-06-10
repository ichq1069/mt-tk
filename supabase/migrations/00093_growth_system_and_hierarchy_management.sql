-- 1. 为 profiles 添加成长值 exp 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exp integer DEFAULT 0;

-- 2. 修改 rank_configs 使用成长值作为门槛
-- 先删除旧的触发器，以免冲突
DROP TRIGGER IF EXISTS tr_update_user_rank ON public.profiles;

ALTER TABLE public.rank_configs RENAME COLUMN min_points TO min_exp;

-- 3. 创建成长值日志表
CREATE TABLE IF NOT EXISTS public.growth_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    reason text,
    type text, -- 如 'post', 'comment', 'collect', 'report', 'login', 'checkin'
    created_at timestamp with time zone DEFAULT now()
);

-- 4. 更新用户等级触发器 (基于 exp)
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS trigger AS $$
DECLARE
    new_rank text;
BEGIN
    -- 找到符合成长值要求的最高等级
    SELECT name INTO new_rank 
    FROM public.rank_configs 
    WHERE min_exp <= NEW.exp 
    ORDER BY min_exp DESC 
    LIMIT 1;

    NEW.rank := COALESCE(new_rank, (SELECT name FROM public.rank_configs ORDER BY min_exp ASC LIMIT 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_user_rank
BEFORE UPDATE OF exp ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rank();

-- 5. 添加成长值记录 RPC
CREATE OR REPLACE FUNCTION public.add_user_exp(p_user_id uuid, p_amount integer, p_reason text, p_type text)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET exp = exp + p_amount WHERE id = p_user_id;
    INSERT INTO public.growth_logs (user_id, amount, reason, type)
    VALUES (p_user_id, p_amount, p_reason, p_type);
END;
$$ LANGUAGE plpgsql;

-- 6. 修改现有逻辑以同时增加积分和成长值 (可选，但在数据库层面做更稳)
-- 例如：发布内容、签到等。

-- 7. 确保 digital_id_configs 被正确使用
-- 我们需要确保 digital_id_configs 在 DigitalIdManagementSection.tsx 中可以被修改
