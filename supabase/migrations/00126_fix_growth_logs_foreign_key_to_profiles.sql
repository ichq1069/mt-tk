-- 1. 删除旧的指向 auth.users (或错误的 users 表) 的外键
ALTER TABLE public.growth_logs 
DROP CONSTRAINT IF EXISTS growth_logs_user_id_fkey;

-- 2. 重新创建指向 public.profiles 的外键，确保 PostgREST 能识别
ALTER TABLE public.growth_logs 
ADD CONSTRAINT growth_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. 同时确保 profiles 上的等级同步触发器也记录流水到正确的表
CREATE OR REPLACE FUNCTION public.handle_profiles_exp_sync()
RETURNS trigger AS $$
DECLARE
    v_new_rank TEXT;
BEGIN
    -- 仅在 exp 发生变化时执行
    IF (OLD.exp IS DISTINCT FROM NEW.exp) THEN
        -- A. 如果是手动修改（非 add_user_exp 函数触发），自动补一条流水
        IF NOT EXISTS (
            SELECT 1 FROM public.growth_logs 
            WHERE user_id = NEW.id 
            AND amount = (NEW.exp - OLD.exp)
            AND created_at > now() - interval '2 seconds'
        ) THEN
            INSERT INTO public.growth_logs (user_id, amount, reason, type)
            VALUES (NEW.id, (NEW.exp - OLD.exp), '系统调整成长值', 'system');
        END IF;

        -- B. 自动更新等级名称 (rank 字段)
        SELECT name INTO v_new_rank 
        FROM public.rank_configs 
        WHERE min_exp <= NEW.exp 
        ORDER BY min_exp DESC 
        LIMIT 1;

        IF v_new_rank IS NOT NULL THEN
            NEW.rank := v_new_rank;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
