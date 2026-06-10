-- 为 media_items 增加推荐系统字段
ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS heat_score DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 创建推荐设置表
CREATE TABLE IF NOT EXISTS recommendation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    weights JSONB DEFAULT '{
        "view_weight": 1.0,
        "favorite_weight": 5.0,
        "time_decay_factor": 0.5,
        "manual_boost_weight": 10.0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认设置
INSERT INTO recommendation_settings (name, weights)
VALUES ('default', '{
    "view_weight": 1.0,
    "favorite_weight": 5.0,
    "time_decay_factor": 0.5,
    "manual_boost_weight": 10.0
}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 更新热度算法函数 (可选，如果以后需要自动化的话，先留着框架)
-- 这里用户说的是管理员手动“升降热度”，所以我们提供 RPC 来手动修改 heat_score 即可。

-- 管理员操作 RPC
CREATE OR REPLACE FUNCTION adjust_heat(p_item_id UUID, p_amount DOUBLE PRECISION)
RETURNS VOID AS $$
BEGIN
    UPDATE media_items 
    SET heat_score = heat_score + p_amount 
    WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 统一设置推荐与隐藏状态 RPC
CREATE OR REPLACE FUNCTION update_media_admin_status(
    p_item_id UUID, 
    p_is_recommended BOOLEAN DEFAULT NULL, 
    p_is_hidden BOOLEAN DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE media_items 
    SET 
        is_recommended = COALESCE(p_is_recommended, is_recommended),
        is_hidden = COALESCE(p_is_hidden, is_hidden),
        status = CASE 
                    WHEN p_status = 'approved'::public.item_status THEN 'approved'::public.item_status
                    WHEN p_status = 'archived'::public.item_status THEN 'archived'::public.item_status
                    WHEN p_status = 'pending'::public.item_status THEN 'pending'::public.item_status
                    WHEN p_status = 'rejected'::public.item_status THEN 'rejected'::public.item_status
                    ELSE status
                 END
    WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
