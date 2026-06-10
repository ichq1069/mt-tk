-- 1. 创建同步成长值流水和等级的触发器函数
CREATE OR REPLACE FUNCTION public.handle_profiles_exp_sync()
RETURNS trigger AS $$
DECLARE
    v_new_rank TEXT;
BEGIN
    -- 仅在 exp 发生变化时执行
    IF (OLD.exp IS DISTINCT FROM NEW.exp) THEN
        -- A. 如果是手动修改（非 add_user_exp 函数触发），自动补一条流水
        -- 注意：这里无法百分百确定是否由 add_user_exp 触发，但可以检查是否有极近时间的流水
        -- 为了保险起见，如果 exp 差异较大且没有对应流水，我们记录一条“系统调整”
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

-- 2. 绑定触发器到 profiles 表
DROP TRIGGER IF EXISTS tr_profiles_exp_sync ON public.profiles;
CREATE TRIGGER tr_profiles_exp_sync
BEFORE UPDATE OF exp ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_exp_sync();

-- 3. 初始同步：为所有现有用户同步一次等级
DO $$
DECLARE
    r RECORD;
    v_rank TEXT;
BEGIN
    FOR r IN SELECT id, exp FROM public.profiles LOOP
        SELECT name INTO v_rank 
        FROM public.rank_configs 
        WHERE min_exp <= r.exp 
        ORDER BY min_exp DESC 
        LIMIT 1;
        
        IF v_rank IS NOT NULL THEN
            UPDATE public.profiles SET "rank" = v_rank WHERE id = r.id;
        END IF;
    END LOOP;
END;
$$;
