-- 5. 每日登录奖励 (基于 user_visit_stats)
CREATE OR REPLACE FUNCTION public.handle_visit_growth()
RETURNS trigger AS $$
DECLARE
    v_count integer;
BEGIN
    -- 检查该用户今天是否已经有过访问统计记录
    SELECT count(*) INTO v_count 
    FROM public.user_visit_stats 
    WHERE user_id = NEW.user_id 
    AND visit_date = NEW.visit_date;

    -- 如果是当天的第一条记录，奖励 5 成长值
    IF v_count = 1 THEN
        PERFORM public.add_user_exp(NEW.user_id, 5, '每日登录奖励', 'login');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_visit_growth ON public.user_visit_stats;
CREATE TRIGGER tr_visit_growth
AFTER INSERT ON public.user_visit_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_visit_growth();
