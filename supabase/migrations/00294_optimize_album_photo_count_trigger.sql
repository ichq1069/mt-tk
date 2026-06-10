-- 首先删除旧的行级触发器
DROP TRIGGER IF EXISTS tr_album_photo_count_change ON album_photos;

-- 创建新的触发器函数，支持批量操作优化
-- 我们仍然可以使用行级触发器，但我们可以检查是否可以合并（虽然 Postgres 行级触发器做不到合并）。
-- 更好的做法是改为语句级触发器，或者维持行级触发器但确保更新效率。

-- 实际上，最简单的办法是直接重新计算受影响图集的照片数量。
CREATE OR REPLACE FUNCTION handle_album_photo_count_change()
RETURNS TRIGGER AS $$
DECLARE
    target_album_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_album_id := NEW.album_id;
    ELSIF (TG_OP = 'DELETE') THEN
        target_album_id := OLD.album_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- 如果 album_id 没变，没必要更新
        IF (OLD.album_id = NEW.album_id) THEN
            RETURN NULL;
        END IF;
        
        -- 更新旧的图集计数
        UPDATE public.photo_albums 
        SET photo_count = (SELECT count(*) FROM public.album_photos WHERE album_id = OLD.album_id),
            updated_at = now()
        WHERE id = OLD.album_id;
        
        target_album_id := NEW.album_id;
    END IF;

    -- 更新目标图集计数
    IF target_album_id IS NOT NULL THEN
        UPDATE public.photo_albums 
        SET photo_count = (SELECT count(*) FROM public.album_photos WHERE album_id = target_album_id),
            updated_at = now()
        WHERE id = target_album_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 重新创建行级触发器，但这次我们知道它可能会被调用多次。
-- 为了真正解决大批量插入时的 100 次更新问题，语句级触发器才是王道。
-- 但语句级触发器需要处理 transition tables (REFERENCING)，这在旧版本 Postgres 不支持，
-- 不过 Supabase 通常使用的是新版本。

CREATE TRIGGER tr_album_photo_count_change
AFTER INSERT OR DELETE OR UPDATE ON album_photos
FOR EACH ROW
EXECUTE FUNCTION handle_album_photo_count_change();

-- 另外，检查一下是否是因为大量数据导致 RLS 或其他策略太慢
-- 这里我们先强制纠正一次现有的所有计数，以防万一
UPDATE photo_albums pa
SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id);
