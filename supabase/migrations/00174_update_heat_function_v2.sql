-- 1. 添加 manual_boost 字段
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS manual_boost FLOAT DEFAULT 0;

-- 2. 创建一个更新所有热度的 SQL 函数
CREATE OR REPLACE FUNCTION update_all_media_heat_scores()
RETURNS void AS $$
DECLARE
    v_v_weight FLOAT;
    v_f_weight FLOAT;
    v_time_decay FLOAT;
BEGIN
    -- 获取权重配置
    -- 使用具体的字段名替代 weights->>'field' 以防字段名变动
    SELECT 
        COALESCE((weights->>'view_weight')::FLOAT, 1.0),
        COALESCE((weights->>'favorite_weight')::FLOAT, 5.0),
        COALESCE((weights->>'time_decay_factor')::FLOAT, 0.99)
    INTO v_v_weight, v_f_weight, v_time_decay
    FROM public.recommendation_settings
    LIMIT 1;

    -- 设置默认值
    v_v_weight := COALESCE(v_v_weight, 1.0);
    v_f_weight := COALESCE(v_f_weight, 5.0);
    v_time_decay := COALESCE(v_time_decay, 0.99);

    -- 更新所有符合条件的媒体文件的 heat_score
    UPDATE public.media_items m
    SET heat_score = (
        (m.view_count * v_v_weight) + 
        ((SELECT count(*) FROM public.favorites f WHERE f.media_id = m.id) * v_f_weight) + 
        COALESCE(m.manual_boost, 0)
    ) * POWER(v_time_decay, GREATEST(0, EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 3600))
    WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
