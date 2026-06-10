-- 1. 更新发布内容触发器，统一调用 award_user_reward RPC
CREATE OR REPLACE FUNCTION public.handle_post_growth() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status::public.item_status = 'approved'::public.item_status) OR 
       (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status::public.item_status != 'approved'::public.item_status) AND NEW.status::public.item_status = 'approved'::public.item_status) THEN
        -- 调用 RPC 实现统一奖励逻辑，使用 media_id 作为 target_id
        PERFORM public.award_user_reward(
            NEW.user_id, 
            CASE WHEN NEW.type = 'video' THEN 'video_publish' ELSE 'image_publish' END, 
            'post_' || NEW.id::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 更新收藏触发器，统一调用 award_user_reward RPC
CREATE OR REPLACE FUNCTION public.handle_favorite_growth() RETURNS trigger AS $$
BEGIN
    PERFORM public.award_user_reward(NEW.user_id, 'favorite', 'favorite_' || NEW.media_id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 更新访问触发器，统一调用 award_user_reward RPC
CREATE OR REPLACE FUNCTION public.handle_visit_growth() RETURNS trigger AS $$
BEGIN
    -- 统一使用 daily_login 动作
    PERFORM public.award_user_reward(NEW.user_id, 'daily_login', 'daily_login_' || NEW.visit_date::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 更新评论触发器，统一调用 award_user_reward RPC
CREATE OR REPLACE FUNCTION public.handle_comment_growth() RETURNS trigger AS $$
BEGIN
    PERFORM public.award_user_reward(NEW.user_id, 'comment', 'comment_' || NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 更新举报触发器，统一调用 award_user_reward RPC
CREATE OR REPLACE FUNCTION public.handle_report_growth() RETURNS trigger AS $$
BEGIN
    IF (OLD.status IS NULL OR OLD.status::public.item_status != 'accepted'::public.item_status) AND NEW.status::public.item_status = 'accepted'::public.item_status THEN
        PERFORM public.award_user_reward(NEW.user_id, 'report', 'report_' || NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
