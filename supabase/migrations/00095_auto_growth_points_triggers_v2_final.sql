-- 1. 发布内容奖励成长值
CREATE OR REPLACE FUNCTION public.handle_post_growth()
RETURNS trigger AS $$
BEGIN
    PERFORM public.add_user_exp(NEW.user_id, 20, '发布内容奖励', 'post');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_post_growth ON public.media_items;
CREATE TRIGGER tr_post_growth
AFTER INSERT ON public.media_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_post_growth();

-- 2. 收藏奖励成长值
CREATE OR REPLACE FUNCTION public.handle_favorite_growth()
RETURNS trigger AS $$
BEGIN
    PERFORM public.add_user_exp(NEW.user_id, 2, '收藏内容奖励', 'collect');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_favorite_growth ON public.favorites;
CREATE TRIGGER tr_favorite_growth
AFTER INSERT ON public.favorites
FOR EACH ROW
EXECUTE FUNCTION public.handle_favorite_growth();

-- 3. 签到奖励成长值 (从 check_ins 触发)
CREATE OR REPLACE FUNCTION public.handle_check_in_growth()
RETURNS trigger AS $$
BEGIN
    PERFORM public.add_user_exp(NEW.user_id, 10, '签到奖励', 'checkin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_in_growth ON public.check_ins;
CREATE TRIGGER tr_check_in_growth
AFTER INSERT ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION public.handle_check_in_growth();

-- 4. 有效举报奖励 (当举报状态变为 'accepted' 时)
CREATE OR REPLACE FUNCTION public.handle_report_growth()
RETURNS trigger AS $$
BEGIN
    IF (OLD.status IS NULL OR OLD.status::public.item_status != 'accepted'::public.item_status) AND NEW.status::public.item_status = 'accepted'::public.item_status THEN
        PERFORM public.add_user_exp(NEW.user_id, 50, '有效举报奖励', 'report');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_report_growth ON public.reports;
CREATE TRIGGER tr_report_growth
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_report_growth();
