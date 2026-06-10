
-- 创建同步函数
CREATE OR REPLACE FUNCTION sync_media_items_tags()
RETURNS TRIGGER AS $$
DECLARE
    m_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        m_id = OLD.media_id;
    ELSE
        m_id = NEW.media_id;
    END IF;

    UPDATE media_items
    SET tags = (
        SELECT COALESCE(array_agg(t.name), '{}')
        FROM media_tags mt
        JOIN tags t ON mt.tag_id = t.id
        WHERE mt.media_id = m_id
    )
    WHERE id = m_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_sync_media_items_tags ON media_tags;
CREATE TRIGGER trg_sync_media_items_tags
AFTER INSERT OR UPDATE OR DELETE ON media_tags
FOR EACH ROW EXECUTE FUNCTION sync_media_items_tags();

-- 对现有数据进行初始化同步
UPDATE media_items mi
SET tags = (
    SELECT COALESCE(array_agg(t.name), '{}')
    FROM media_tags mt
    JOIN tags t ON mt.tag_id = t.id
    WHERE mt.media_id = mi.id
);
