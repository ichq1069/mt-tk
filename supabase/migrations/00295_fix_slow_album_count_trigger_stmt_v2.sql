-- 删除之前的行级触发器
DROP TRIGGER IF EXISTS tr_album_photo_count_change ON album_photos;

-- 定义语句级触发器函数（处理插入/更新）
CREATE OR REPLACE FUNCTION handle_album_photo_count_stmt_upsert()
RETURNS TRIGGER AS $$
BEGIN
    -- 使用 transition tables (new_table) 批量更新受影响的图集数量
    UPDATE photo_albums pa
    SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
        updated_at = now()
    WHERE id IN (SELECT DISTINCT album_id FROM new_table);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 定义语句级触发器函数（处理删除）
CREATE OR REPLACE FUNCTION handle_album_photo_count_stmt_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- 使用 transition tables (old_table) 批量更新受影响的图集数量
    UPDATE photo_albums pa
    SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
        updated_at = now()
    WHERE id IN (SELECT DISTINCT album_id FROM old_table);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为 INSERT, UPDATE, DELETE 分别创建语句级触发器
CREATE TRIGGER tr_album_photo_count_insert_stmt
AFTER INSERT ON album_photos
REFERENCING NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_upsert();

-- 只有 album_id 变化时才在语句结束时重新计数可能太复杂，直接全量重新计数受影响的。
CREATE TRIGGER tr_album_photo_count_update_stmt
AFTER UPDATE ON album_photos
REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_upsert();

CREATE TRIGGER tr_album_photo_count_delete_stmt
AFTER DELETE ON album_photos
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_delete();
