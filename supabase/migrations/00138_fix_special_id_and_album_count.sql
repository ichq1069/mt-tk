-- 1. Fix buy_special_id function to use min_exp instead of min_points
CREATE OR REPLACE FUNCTION public.buy_special_id(p_user_id uuid, p_special_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_digital_id text;
    v_price integer;
    v_is_sold boolean;
    v_required_rank text;
    v_user_exp integer;
    v_required_exp integer;
    v_user_current_points integer;
BEGIN
    -- 1. 获取靓号信息
    SELECT digital_id, price, is_sold, required_rank INTO v_digital_id, v_price, v_is_sold, v_required_rank
    FROM public.special_digital_ids 
    WHERE id = p_special_id;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该号码已被售出');
    END IF;

    -- 2. 获取用户信息
    SELECT exp, points INTO v_user_exp, v_user_current_points FROM public.profiles WHERE id = p_user_id;
    
    -- 3. 检查等级要求
    IF v_required_rank IS NOT NULL AND v_required_rank <> '' THEN
        SELECT min_exp INTO v_required_exp FROM public.rank_configs WHERE name = v_required_rank;
        
        IF v_required_exp IS NOT NULL AND (v_user_exp IS NULL OR v_user_exp < v_required_exp) THEN
            RETURN jsonb_build_object('success', false, 'error', '您的等级不足以购买此号码 (需要: ' || v_required_rank || ')');
        END IF;
    END IF;

    -- 4. 检查积分是否足够
    IF v_user_current_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 5. 扣除积分并更新用户 ID
    UPDATE public.profiles 
    SET points = points - v_price, 
        digital_id = v_digital_id 
    WHERE id = p_user_id;

    -- 6. 标记靓号已售出
    UPDATE public.special_digital_ids 
    SET is_sold = true 
    WHERE id = p_special_id;

    -- 7. 记录日志
    INSERT INTO public.points_logs (user_id, amount, type, reason)
    VALUES (p_user_id, -v_price, 'buy_id', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 2. Add trigger to update photo_count in photo_albums
CREATE OR REPLACE FUNCTION handle_album_photo_count_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.photo_albums 
        SET photo_count = photo_count + 1,
            updated_at = now()
        WHERE id = NEW.album_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.photo_albums 
        SET photo_count = GREATEST(0, photo_count - 1),
            updated_at = now()
        WHERE id = OLD.album_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.album_id <> NEW.album_id) THEN
            UPDATE public.photo_albums 
            SET photo_count = GREATEST(0, photo_count - 1),
                updated_at = now()
            WHERE id = OLD.album_id;
            
            UPDATE public.photo_albums 
            SET photo_count = photo_count + 1,
                updated_at = now()
            WHERE id = NEW.album_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_album_photo_count_change ON public.album_photos;
CREATE TRIGGER tr_album_photo_count_change
AFTER INSERT OR DELETE OR UPDATE OF album_id ON public.album_photos
FOR EACH ROW EXECUTE FUNCTION handle_album_photo_count_change();

-- 3. Sync existing counts
UPDATE public.photo_albums a
SET photo_count = (SELECT count(*) FROM public.album_photos p WHERE p.album_id = a.id);
