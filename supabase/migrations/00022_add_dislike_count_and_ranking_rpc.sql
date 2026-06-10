-- 1. 添加 dislike_count 列到 media_items
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS dislike_count BIGINT DEFAULT 0;

-- 2. 创建或更新不喜欢计数的函数
CREATE OR REPLACE FUNCTION update_dislike_count() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE media_items 
        SET dislike_count = dislike_count + 1 
        WHERE id = NEW.media_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE media_items 
        SET dislike_count = dislike_count - 1 
        WHERE id = OLD.media_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建或更新触发器
DROP TRIGGER IF EXISTS tr_dislike_count ON dislikes;
CREATE TRIGGER tr_dislike_count
AFTER INSERT OR DELETE ON dislikes
FOR EACH ROW EXECUTE FUNCTION update_dislike_count();

-- 4. 初始化现有的 dislike_count 数据
UPDATE media_items mi
SET dislike_count = (
    SELECT count(*) 
    FROM dislikes d 
    WHERE d.media_id = mi.id
);

-- 5. 创建获取最受不喜欢媒体的 RPC
CREATE OR REPLACE FUNCTION get_top_disliked_media(limit_count INT)
RETURNS SETOF media_items AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM media_items
    WHERE status::public.item_status = 'approved'::public.item_status
    ORDER BY dislike_count DESC, created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
