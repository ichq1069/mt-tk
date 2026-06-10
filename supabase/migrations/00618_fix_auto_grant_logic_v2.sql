DROP FUNCTION IF EXISTS public.check_user_badges(uuid);
DROP FUNCTION IF EXISTS public.check_and_grant_auto_badges(uuid);

CREATE OR REPLACE FUNCTION public.check_and_grant_auto_badges(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_task RECORD;
    v_current_val integer;
    v_granted_count integer := 0;
BEGIN
    FOR v_task IN 
        SELECT bt.*, b.name as badge_name 
        FROM public.badge_tasks bt
        JOIN public.badges b ON b.id = bt.badge_id
        WHERE bt.is_active = true 
          AND bt.claim_type = 'auto'
          AND NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = bt.badge_id)
    LOOP
        -- 获取当前指标值
        CASE v_task.task_type
            WHEN 'checkin_count' THEN
                SELECT count(*) INTO v_current_val FROM public.check_ins WHERE user_id = p_user_id;
            WHEN 'upload_count' THEN
                SELECT count(*) INTO v_current_val FROM public.media_items WHERE user_id = p_user_id AND status = 'approved';
            WHEN 'favorite_count' THEN
                SELECT count(*) INTO v_current_val 
                FROM public.favorites f
                JOIN public.media_items m ON m.id = f.media_id
                WHERE m.user_id = p_user_id;
            ELSE
                v_current_val := 0;
        END CASE;

        -- 满足条件则授勋
        IF v_current_val >= v_task.target_value THEN
            INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
            VALUES (p_user_id, v_task.badge_id, now())
            ON CONFLICT (user_id, badge_id) DO NOTHING;
            
            v_granted_count := v_granted_count + 1;

            -- 发送系统通知
            INSERT INTO public.notifications (user_id, title, content, type)
            VALUES (p_user_id, '获得新勋章', '恭喜！您已达成条件，系统自动为您发放了【' || v_task.badge_name || '】勋章。', 'system');
        END IF;
    END LOOP;
    
    RETURN v_granted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_badges(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN public.check_and_grant_auto_badges(p_user_id);
END;
$function$;
