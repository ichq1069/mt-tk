CREATE OR REPLACE FUNCTION adjust_heat(p_item_id UUID, p_amount FLOAT)
RETURNS void AS $$
BEGIN
    UPDATE public.media_items 
    SET manual_boost = COALESCE(manual_boost, 0) + p_amount,
        heat_score = COALESCE(heat_score, 0) + p_amount -- 同时更新热度，以便前端即时反馈
    WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;
